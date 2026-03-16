// ---------------------------------------------------------------------------
// Torneio PvP — Fase 25
// Referência: GDD_Sistemas §1.10
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { startCombat } from './combat'
import { createNotification } from './notifications'
import { createEvent } from './events'

interface PrizeTier {
  libras?: number
  gemas?: number
  itemId?: string
}

interface PrizePool {
  first: PrizeTier
  second: PrizeTier
  third: PrizeTier
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function totalRoundsForSize(maxParticipants: number): number {
  return Math.log2(maxParticipants)
}

// ─── gmCreateTournament ───────────────────────────────────────────────────────

export async function gmCreateTournament(input: {
  gmCharacterId: string
  name: string
  description?: string
  maxParticipants: 8 | 16 | 32
  registrationEndsAt: string
  prizePool: PrizePool
}): Promise<{ success: boolean; tournamentId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      name: input.name,
      description: input.description ?? null,
      max_participants: input.maxParticipants,
      registration_ends_at: input.registrationEndsAt,
      prize_pool: input.prizePool as unknown as Record<string, unknown>,
      created_by: input.gmCharacterId,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !tournament) return { success: false, error: 'Erro ao criar torneio.' }

  await createEvent(supabase, {
    type: 'general' as string,
    actorId: input.gmCharacterId,
    metadata: { tournament_id: tournament.id, name: input.name },
    isPublic: true,
    narrativeText: `Torneio "${input.name}" aberto para inscrições.`,
  })

  return { success: true, tournamentId: tournament.id }
}

// ─── registerForTournament ────────────────────────────────────────────────────

export async function registerForTournament(
  tournamentId: string,
  characterId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Tournament validation
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, status, max_participants, registration_ends_at')
    .eq('id', tournamentId)
    .single()
  if (!tournament) return { success: false, error: 'Torneio não encontrado.' }
  if (tournament.status !== 'open') return { success: false, error: 'Inscrições encerradas.' }
  if (new Date(tournament.registration_ends_at) < new Date()) {
    return { success: false, error: 'Prazo de inscrição expirado.' }
  }

  // Already registered?
  const { data: existing } = await supabase
    .from('tournament_participants')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('character_id', characterId)
    .maybeSingle()
  if (existing) return { success: false, error: 'Já inscrito neste torneio.' }

  // Slots available?
  const { count } = await supabase
    .from('tournament_participants')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
  if ((count ?? 0) >= tournament.max_participants) {
    return { success: false, error: 'Torneio lotado.' }
  }

  await supabase.from('tournament_participants').insert({
    tournament_id: tournamentId,
    character_id: characterId,
  })

  return { success: true }
}

// ─── gmGenerateBracket ────────────────────────────────────────────────────────

export async function gmGenerateBracket(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, status, max_participants')
    .eq('id', tournamentId)
    .single()
  if (!tournament) return { success: false, error: 'Torneio não encontrado.' }
  if (tournament.status !== 'open') return { success: false, error: 'Torneio não está aberto.' }

  const { data: participants } = await supabase
    .from('tournament_participants')
    .select('id, character_id')
    .eq('tournament_id', tournamentId)

  if (!participants || participants.length < 2) {
    return { success: false, error: 'Mínimo de 2 participantes necessário.' }
  }

  const maxP = tournament.max_participants as number
  const shuffled = shuffle(participants)

  // Assign seeds
  for (let i = 0; i < shuffled.length; i++) {
    await supabase
      .from('tournament_participants')
      .update({ seed: i + 1 })
      .eq('id', shuffled[i].id)
  }

  // Create round 1 matches
  const matchesR1 = maxP / 2

  for (let m = 0; m < matchesR1; m++) {
    const seedA = m * 2 + 1
    const seedB = m * 2 + 2
    const pA = shuffled.find((_, idx) => idx === seedA - 1)
    const pB = shuffled.find((_, idx) => idx === seedB - 1)

    const isBye = !pB // No participant B means bye
    await supabase.from('tournament_matches').insert({
      tournament_id: tournamentId,
      round: 1,
      match_number: m + 1,
      participant_a_id: pA?.id ?? null,
      participant_b_id: pB?.id ?? null,
      is_bye: isBye,
      winner_id: isBye ? pA?.id ?? null : null,
      status: isBye ? 'finished' : 'pending',
    })
  }

  // Update tournament status
  await supabase
    .from('tournaments')
    .update({ status: 'bracket_generated', starts_at: new Date().toISOString() })
    .eq('id', tournamentId)

  // Notify all participants
  for (const p of shuffled) {
    await createNotification({
      characterId: p.character_id,
      type: 'general',
      title: 'Bracket gerado',
      body: 'O bracket do torneio foi gerado. Aguarde a convocação para seu confronto.',
      actionUrl: `/tournament/${tournamentId}`,
    })
  }

  return { success: true }
}

// ─── gmAdvanceBracket ────────────────────────────────────────────────────────

export async function gmAdvanceBracket(
  matchId: string,
  gmUserId: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('tournament_matches')
    .select('*, tournament_participants!participant_a_id(character_id), tournaments(id, status)')
    .eq('id', matchId)
    .single()
  if (!match) return { success: false, error: 'Confronto não encontrado.' }
  if (match.status !== 'pending') return { success: false, error: 'Confronto não está pendente.' }
  if (!match.participant_a_id || !match.participant_b_id) {
    return { success: false, error: 'Confronto sem dois participantes.' }
  }

  // Get character IDs for both participants
  const [{ data: pA }, { data: pB }] = await Promise.all([
    supabase.from('tournament_participants').select('character_id').eq('id', match.participant_a_id).single(),
    supabase.from('tournament_participants').select('character_id').eq('id', match.participant_b_id).single(),
  ])
  if (!pA || !pB) return { success: false, error: 'Participantes não encontrados.' }

  // Check neither is in active combat
  for (const p of [{ id: pA.character_id, label: 'A' }, { id: pB.character_id, label: 'B' }]) {
    const { data: activeCombat } = await supabase
      .from('combat_sessions')
      .select('id')
      .or(`challenger_id.eq.${p.id},defender_id.eq.${p.id}`)
      .eq('status', 'active')
      .maybeSingle()
    if (activeCombat) {
      const { data: charName } = await supabase.from('characters').select('name').eq('id', p.id).single()
      return { success: false, error: `${charName?.name ?? 'Participante'} está em combate ativo. Aguarde a conclusão.` }
    }
  }

  // Start combat
  const result = await startCombat(pA.character_id, pB.character_id, 'torneio', gmUserId)
  if (!result.success || !result.sessionId) {
    return { success: false, error: result.error ?? 'Erro ao iniciar combate.' }
  }

  // Update match
  await supabase
    .from('tournament_matches')
    .update({ combat_session_id: result.sessionId, status: 'waiting_combat' })
    .eq('id', matchId)

  // Update tournament status if needed
  const tournamentId = match.tournament_id
  const tournament = match.tournaments as Record<string, unknown> | null
  if (tournament?.status === 'bracket_generated') {
    await supabase.from('tournaments').update({ status: 'in_progress' }).eq('id', tournamentId)
  }

  // Notify both
  for (const charId of [pA.character_id, pB.character_id]) {
    await createNotification({
      characterId: charId,
      type: 'duel_received',
      title: 'Confronto de Torneio',
      body: 'Seu confronto de torneio está pronto. Entre na arena.',
      actionUrl: `/combat`,
      metadata: { session_id: result.sessionId },
    })
  }

  return { success: true, sessionId: result.sessionId }
}

// ─── resolveTournamentMatch ───────────────────────────────────────────────────

export async function resolveTournamentMatch(
  sessionId: string,
  winnerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Find the match
  const { data: match } = await supabase
    .from('tournament_matches')
    .select('*, tournaments(id, max_participants)')
    .eq('combat_session_id', sessionId)
    .maybeSingle()

  if (!match) return { success: true } // Not a tournament match — ignore silently

  const tournamentId = match.tournament_id as string
  const maxP = (match.tournaments as Record<string, unknown>)?.max_participants as number ?? 8
  const totalRounds = totalRoundsForSize(maxP)

  // Determine winner participant
  const [{ data: pA }, { data: pB }] = await Promise.all([
    supabase.from('tournament_participants').select('id, character_id').eq('id', match.participant_a_id).single(),
    supabase.from('tournament_participants').select('id, character_id').eq('id', match.participant_b_id).single(),
  ])

  const winnerParticipantId = pA?.character_id === winnerId ? pA.id
    : pB?.character_id === winnerId ? pB.id
    : null
  const loserParticipantId = winnerParticipantId === pA?.id ? pB?.id : pA?.id

  if (!winnerParticipantId) return { success: false, error: 'Vencedor não é participante deste confronto.' }

  // Update match
  await supabase
    .from('tournament_matches')
    .update({ winner_id: winnerParticipantId, status: 'finished' })
    .eq('id', match.id)

  // Eliminate loser
  if (loserParticipantId) {
    await supabase
      .from('tournament_participants')
      .update({ eliminated_at: new Date().toISOString() })
      .eq('id', loserParticipantId)
  }

  const currentRound = match.round as number

  // Check if round is complete
  const { count: pendingInRound } = await supabase
    .from('tournament_matches')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('round', currentRound)
    .neq('status', 'finished')

  if ((pendingInRound ?? 0) > 0) return { success: true } // Round not done yet

  // Round complete — check if this was the final
  if (currentRound >= totalRounds) {
    await gmFinishTournament(tournamentId)
    return { success: true }
  }

  // Generate next round matches
  const { data: roundMatches } = await supabase
    .from('tournament_matches')
    .select('winner_id, match_number')
    .eq('tournament_id', tournamentId)
    .eq('round', currentRound)
    .order('match_number')

  if (!roundMatches) return { success: true }

  const winners = roundMatches.map((m) => m.winner_id)
  const nextRound = currentRound + 1
  const nextMatchCount = winners.length / 2

  for (let m = 0; m < nextMatchCount; m++) {
    const aId = winners[m * 2] ?? null
    const bId = winners[m * 2 + 1] ?? null
    const isBye = !aId || !bId

    await supabase.from('tournament_matches').insert({
      tournament_id: tournamentId,
      round: nextRound,
      match_number: m + 1,
      participant_a_id: aId,
      participant_b_id: bId,
      is_bye: isBye,
      winner_id: isBye ? (aId ?? bId) : null,
      status: isBye ? 'finished' : 'pending',
    })
  }

  // Create event
  await createEvent(supabase, {
    type: 'general' as string,
    metadata: { tournament_id: tournamentId, round: nextRound },
    isPublic: true,
    narrativeText: `Rodada ${currentRound} concluída. Rodada ${nextRound} pronta.`,
  })

  return { success: true }
}

// ─── gmFinishTournament ───────────────────────────────────────────────────────

export async function gmFinishTournament(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, max_participants, prize_pool')
    .eq('id', tournamentId)
    .single()
  if (!tournament) return { success: false, error: 'Torneio não encontrado.' }

  const maxP = tournament.max_participants as number
  const totalRounds = totalRoundsForSize(maxP)
  const prizePool = tournament.prize_pool as unknown as PrizePool

  // Find final match
  const { data: finalMatch } = await supabase
    .from('tournament_matches')
    .select('winner_id, participant_a_id, participant_b_id')
    .eq('tournament_id', tournamentId)
    .eq('round', totalRounds)
    .eq('match_number', 1)
    .single()

  if (!finalMatch?.winner_id) return { success: false, error: 'Final não resolvida.' }

  const firstId = finalMatch.winner_id
  const secondId = finalMatch.winner_id === finalMatch.participant_a_id
    ? finalMatch.participant_b_id
    : finalMatch.participant_a_id

  // Find semi-final losers for 3rd place
  const semiRound = totalRounds - 1
  const { data: semiMatches } = await supabase
    .from('tournament_matches')
    .select('winner_id, participant_a_id, participant_b_id')
    .eq('tournament_id', tournamentId)
    .eq('round', semiRound)

  const semiLosers = (semiMatches ?? [])
    .map((m) => m.winner_id === m.participant_a_id ? m.participant_b_id : m.participant_a_id)
    .filter((id): id is string => id !== null && id !== firstId && id !== secondId)

  // Update final positions
  const positions: Array<{ participantId: string; position: number; prizeKey: 'first' | 'second' | 'third' }> = [
    { participantId: firstId, position: 1, prizeKey: 'first' },
  ]
  if (secondId) positions.push({ participantId: secondId, position: 2, prizeKey: 'second' })
  for (const loserId of semiLosers) {
    positions.push({ participantId: loserId, position: 3, prizeKey: 'third' })
  }

  for (const pos of positions) {
    await supabase
      .from('tournament_participants')
      .update({ final_position: pos.position })
      .eq('id', pos.participantId)

    // Get character_id
    const { data: participant } = await supabase
      .from('tournament_participants')
      .select('character_id')
      .eq('id', pos.participantId)
      .single()
    if (!participant) continue

    const prize = prizePool[pos.prizeKey]
    const walletUpdates: Record<string, number> = {}

    // Grant prizes
    if (prize.libras && prize.libras > 0) {
      const { data: wallet } = await supabase
        .from('character_wallet')
        .select('libras')
        .eq('character_id', participant.character_id)
        .single()
      if (wallet) walletUpdates.libras = wallet.libras + prize.libras
    }
    if (prize.gemas && prize.gemas > 0) {
      const { data: wallet } = await supabase
        .from('character_wallet')
        .select('premium_currency')
        .eq('character_id', participant.character_id)
        .single()
      if (wallet) walletUpdates.premium_currency = (wallet.premium_currency ?? 0) + prize.gemas
    }

    if (Object.keys(walletUpdates).length > 0) {
      await supabase
        .from('character_wallet')
        .update(walletUpdates as never)
        .eq('character_id', participant.character_id)
    }

    // Notify winner
    const prizeDesc = [
      prize.libras ? `${prize.libras} Libras` : '',
      prize.gemas ? `${prize.gemas} Gemas` : '',
    ].filter(Boolean).join(' + ') || 'Parabéns!'

    await createNotification({
      characterId: participant.character_id,
      type: 'general',
      title: `${pos.position}º lugar — ${tournament.name}`,
      body: `Você conquistou o ${pos.position}º lugar no torneio. Prêmio: ${prizeDesc}`,
      actionUrl: `/tournament/${tournamentId}`,
    })
  }

  // Finish tournament
  await supabase
    .from('tournaments')
    .update({ status: 'finished', finished_at: new Date().toISOString() })
    .eq('id', tournamentId)

  await createEvent(supabase, {
    type: 'general' as string,
    metadata: { tournament_id: tournamentId, name: tournament.name },
    isPublic: true,
    narrativeText: `Torneio "${tournament.name}" encerrado.`,
  })

  return { success: true }
}

// ---------------------------------------------------------------------------
// Dungeons em Grupo — Fase 20
// Referência: GDD_Sistemas §3
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'
import { createNotification } from './notifications'
import { grantXp } from './levelup'

export type DungeonDifficulty = 'normal' | 'dificil' | 'lendario'
export type DungeonStatus = 'recruiting' | 'active' | 'finished' | 'failed' | 'cancelled'
export type DungeonResult = 'success' | 'partial' | 'failure'
export type ParticipantStatus = 'invited' | 'ready' | 'active' | 'fallen' | 'survived'

// Multiplicadores de dificuldade
const DIFFICULTY_MULTIPLIERS: Record<DungeonDifficulty, number> = {
  normal:   1.0,
  dificil:  1.8,
  lendario: 3.0,
}

// Pool de eventos narrativos por fase
const PHASE_EVENTS = [
  'O grupo avanca pela escuridao. Sons distantes ecoam nas paredes.',
  'Uma armadilha antiga e ativada. O grupo precisa agir rapido.',
  'Criaturas surgem das sombras. A batalha comeca.',
  'Uma camara selada se abre, revelando segredos do passado.',
  'O chao treme. Algo grande se aproxima.',
  'Um altar antigo pulsa com energia eterea.',
  'O grupo encontra rastros recentes. Nao estao sozinhos.',
  'Uma nevoa densa obscurece a visao. Cada passo e incerto.',
  'Glifos nas paredes brilham ao toque. Uma mensagem do passado.',
  'O inimigo final se manifesta. Tudo culmina aqui.',
]

/**
 * Cria uma sessao de dungeon. Lider e adicionado automaticamente.
 */
export async function createDungeonSession(
  leaderId: string,
  userId: string,
  dungeonTypeId: string,
  difficulty: DungeonDifficulty
): Promise<{ success: boolean; error?: string; sessionId?: string }> {
  const supabase = await createClient()

  // Verifica ownership
  const { data: leader } = await supabase
    .from('characters')
    .select('id, name, level, recovery_until')
    .eq('id', leaderId)
    .eq('user_id', userId)
    .single()
  if (!leader) return { success: false, error: 'Personagem nao encontrado.' }

  // Verifica recovery
  if (leader.recovery_until && new Date(leader.recovery_until) > new Date()) {
    return { success: false, error: 'Personagem em recuperacao.' }
  }

  // Verifica tipo de dungeon
  const { data: dungeonType } = await supabase
    .from('dungeon_types')
    .select('*')
    .eq('id', dungeonTypeId)
    .eq('is_active', true)
    .single()
  if (!dungeonType) return { success: false, error: 'Tipo de dungeon nao encontrado.' }

  // Verifica nivel minimo
  if (leader.level < dungeonType.min_level) {
    return {
      success: false,
      error: `Nivel ${dungeonType.min_level} necessario para esta dungeon.`,
    }
  }

  // Verifica se ja esta em dungeon ativa
  const { data: activeParticipations } = await supabase
    .from('dungeon_participants')
    .select('session_id, dungeon_sessions!inner(status)')
    .eq('character_id', leaderId)
    .in('dungeon_sessions.status', ['recruiting', 'active'])

  if (activeParticipations && activeParticipations.length > 0) {
    return { success: false, error: 'Voce ja esta em uma dungeon.' }
  }

  // Cria sessao
  const { data: session, error } = await supabase
    .from('dungeon_sessions')
    .insert({
      dungeon_type_id: dungeonTypeId,
      leader_id: leaderId,
      status: 'recruiting',
      difficulty,
      current_phase: 0,
    })
    .select()
    .single()
  if (error || !session) return { success: false, error: 'Erro ao criar dungeon.' }

  // Adiciona lider como participante
  await supabase.from('dungeon_participants').insert({
    session_id: session.id,
    character_id: leaderId,
    status: 'ready',
  })

  await createEvent(supabase, {
    type: 'dungeon_created',
    actorId: leaderId,
    metadata: {
      session_id: session.id,
      dungeon_name: dungeonType.name,
      difficulty,
    },
    isPublic: false,
    narrativeText: `${leader.name} abriu uma dungeon: ${dungeonType.name}.`,
  })

  return { success: true, sessionId: session.id }
}

/**
 * Convida um personagem para a dungeon.
 * Apenas o lider pode convidar.
 */
export async function inviteToDungeon(
  sessionId: string,
  leaderId: string,
  userId: string,
  targetCharacterId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica ownership do lider
  const { data: leader } = await supabase
    .from('characters')
    .select('id')
    .eq('id', leaderId)
    .eq('user_id', userId)
    .single()
  if (!leader) return { success: false, error: 'Acesso negado.' }

  // Verifica sessao
  const { data: session } = await supabase
    .from('dungeon_sessions')
    .select('*, dungeon_types(max_players, min_level)')
    .eq('id', sessionId)
    .eq('leader_id', leaderId)
    .eq('status', 'recruiting')
    .single()
  if (!session) return { success: false, error: 'Sessao nao encontrada ou nao esta recrutando.' }

  // Verifica lotacao
  const { count } = await supabase
    .from('dungeon_participants')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
  const dungeonType = session.dungeon_types as Record<string, unknown> | null
  const maxPlayers = (dungeonType?.max_players as number) ?? 4
  if ((count ?? 0) >= maxPlayers) {
    return { success: false, error: 'Dungeon lotada.' }
  }

  // Verifica nivel do convidado
  const { data: target } = await supabase
    .from('characters')
    .select('id, name, level, recovery_until')
    .eq('id', targetCharacterId)
    .single()
  if (!target) return { success: false, error: 'Personagem nao encontrado.' }

  const minLevel = (dungeonType?.min_level as number) ?? 1
  if (target.level < minLevel) {
    return { success: false, error: `Convidado precisa de nivel ${minLevel}.` }
  }

  if (target.recovery_until && new Date(target.recovery_until) > new Date()) {
    return { success: false, error: 'Convidado esta em recuperacao.' }
  }

  // Verifica se ja esta na sessao
  const { data: existing } = await supabase
    .from('dungeon_participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('character_id', targetCharacterId)
    .maybeSingle()
  if (existing) return { success: false, error: 'Personagem ja esta na dungeon.' }

  // Verifica se convidado ja esta em outra dungeon
  const { data: activeParticipations } = await supabase
    .from('dungeon_participants')
    .select('session_id, dungeon_sessions!inner(status)')
    .eq('character_id', targetCharacterId)
    .in('dungeon_sessions.status', ['recruiting', 'active'])

  if (activeParticipations && activeParticipations.length > 0) {
    return { success: false, error: 'Convidado ja esta em outra dungeon.' }
  }

  await supabase.from('dungeon_participants').insert({
    session_id: sessionId,
    character_id: targetCharacterId,
    status: 'invited',
  })

  const { data: leaderChar } = await supabase
    .from('characters')
    .select('name')
    .eq('id', leaderId)
    .single()

  await createNotification({
    characterId: targetCharacterId,
    type: 'dungeon_invite',
    title: 'Convite para Dungeon',
    body: `${leaderChar?.name ?? 'Alguém'} convidou você para uma dungeon.`,
    actionUrl: '/dungeon',
    metadata: { session_id: sessionId },
  })

  return { success: true }
}

/**
 * Aceita convite para dungeon.
 */
export async function acceptDungeonInvite(
  sessionId: string,
  characterId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem nao encontrado.' }

  const { error } = await supabase
    .from('dungeon_participants')
    .update({ status: 'ready' })
    .eq('session_id', sessionId)
    .eq('character_id', characterId)
    .eq('status', 'invited')

  if (error) return { success: false, error: 'Convite nao encontrado.' }
  return { success: true }
}

/**
 * Inicia a dungeon. Apenas o lider pode iniciar.
 * Todos os participantes devem estar ready.
 */
export async function startDungeon(
  sessionId: string,
  leaderId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica ownership
  const { data: leader } = await supabase
    .from('characters')
    .select('id')
    .eq('id', leaderId)
    .eq('user_id', userId)
    .single()
  if (!leader) return { success: false, error: 'Acesso negado.' }

  // Busca sessao
  const { data: session } = await supabase
    .from('dungeon_sessions')
    .select('*, dungeon_types(min_players)')
    .eq('id', sessionId)
    .eq('leader_id', leaderId)
    .eq('status', 'recruiting')
    .single()
  if (!session) return { success: false, error: 'Sessao nao encontrada.' }

  // Verifica participantes
  const { data: participants } = await supabase
    .from('dungeon_participants')
    .select('character_id, status')
    .eq('session_id', sessionId)

  const dungeonType = session.dungeon_types as Record<string, unknown> | null
  const minPlayers = (dungeonType?.min_players as number) ?? 2
  if (!participants || participants.length < minPlayers) {
    return { success: false, error: `Minimo de ${minPlayers} participantes.` }
  }

  const notReady = participants.filter((p) => p.status !== 'ready')
  if (notReady.length > 0) {
    return { success: false, error: 'Nem todos os participantes aceitaram.' }
  }

  // Inicia dungeon
  await supabase
    .from('dungeon_sessions')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
      current_phase: 1,
    })
    .eq('id', sessionId)

  // Marca participantes como active
  await supabase
    .from('dungeon_participants')
    .update({ status: 'active' })
    .eq('session_id', sessionId)

  return { success: true }
}

/**
 * Resolve uma fase da dungeon automaticamente (idle).
 * Calcula resultado baseado nos atributos combinados do grupo
 * vs dificuldade. Aplica dano distribuido.
 */
export async function resolveDungeonPhase(
  sessionId: string
): Promise<{
  success: boolean
  error?: string
  phaseResult?: {
    phase: number
    narrative: string
    groupPower: number
    difficulty: number
    success: boolean
    casualties: string[]
  }
  dungeonFinished?: boolean
  finalResult?: DungeonResult
}> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('dungeon_sessions')
    .select('*, dungeon_types(*)')
    .eq('id', sessionId)
    .eq('status', 'active')
    .single()
  if (!session) return { success: false, error: 'Sessao nao encontrada.' }

  const dungeonType = session.dungeon_types as Record<string, unknown>
  const difficulty = session.difficulty as DungeonDifficulty
  const multiplier = DIFFICULTY_MULTIPLIERS[difficulty]
  const totalPhases = (dungeonType.phases as number) ?? 3

  // Busca participantes ativos
  const { data: participants } = await supabase
    .from('dungeon_participants')
    .select('character_id, status')
    .eq('session_id', sessionId)
    .in('status', ['active', 'fallen'])

  const activeParticipants = (participants ?? []).filter((p) => p.status === 'active')

  if (activeParticipants.length === 0) {
    await finishDungeon(supabase, sessionId, 'failure')
    return { success: true, dungeonFinished: true, finalResult: 'failure' }
  }

  // Busca atributos dos participantes ativos com character_id
  const activeIds = activeParticipants.map((p) => p.character_id)
  const { data: attrRows } = await supabase
    .from('character_attributes')
    .select('character_id, ataque, magia, defesa, vitalidade, hp_atual, hp_max')
    .in('character_id', activeIds)

  // Calcula poder do grupo
  let groupPower = 0
  for (const attr of attrRows ?? []) {
    groupPower += (attr.ataque ?? 0) + (attr.magia ?? 0) + (attr.defesa ?? 0)
  }

  // Dificuldade da fase: escala por fase e multiplicador
  const phaseDifficulty = Math.floor(
    50 * multiplier * (0.5 + session.current_phase / totalPhases)
  )

  // Roll de sucesso da fase
  const successThreshold = Math.max(20, 60 - (groupPower / 10))
  const roll = Math.random() * 100
  const phaseSuccess = roll > successThreshold || groupPower > phaseDifficulty * 2

  // Aplica dano ao grupo
  const casualties: string[] = []
  const damagePerChar = phaseSuccess
    ? Math.floor(phaseDifficulty * 0.2)
    : Math.floor(phaseDifficulty * 0.5)

  for (const attr of attrRows ?? []) {
    const newHp = Math.max(0, (attr.hp_atual ?? 0) - damagePerChar)
    await supabase
      .from('character_attributes')
      .update({ hp_atual: newHp })
      .eq('character_id', attr.character_id)

    if (newHp === 0) {
      await supabase
        .from('dungeon_participants')
        .update({ status: 'fallen', hp_final: 0 })
        .eq('session_id', sessionId)
        .eq('character_id', attr.character_id)

      const { data: char } = await supabase
        .from('characters')
        .select('name')
        .eq('id', attr.character_id)
        .single()
      if (char) casualties.push(char.name)
    }
  }

  // Narrativa da fase
  const narrative = PHASE_EVENTS[
    Math.floor(Math.random() * PHASE_EVENTS.length)
  ] + (casualties.length > 0
    ? ` ${casualties.join(', ')} ${casualties.length > 1 ? 'cairam' : 'caiu'} em combate.`
    : '')

  // Atualiza phase_log
  const currentLog = (session.phase_log as unknown[]) ?? []
  const phaseEntry = {
    phase: session.current_phase,
    narrative,
    group_power: groupPower,
    phase_difficulty: phaseDifficulty,
    success: phaseSuccess,
    casualties,
  }
  const newLog = [...currentLog, phaseEntry]

  // Verifica se e a ultima fase ou se todos cairam
  const isLastPhase = session.current_phase >= totalPhases
  const remainingActive = activeParticipants.length - casualties.length

  if (isLastPhase || remainingActive === 0) {
    const allParticipants = participants ?? []
    const survived = activeParticipants.length - casualties.length
    const total = allParticipants.length

    let finalResult: DungeonResult
    if (survived === 0) {
      finalResult = 'failure'
    } else if (survived < total) {
      finalResult = 'partial'
    } else {
      finalResult = 'success'
    }

    await supabase
      .from('dungeon_sessions')
      .update({ phase_log: newLog as unknown as never })
      .eq('id', sessionId)

    await finishDungeon(supabase, sessionId, finalResult)

    return {
      success: true,
      phaseResult: {
        phase: session.current_phase,
        narrative,
        groupPower,
        difficulty: phaseDifficulty,
        success: phaseSuccess,
        casualties,
      },
      dungeonFinished: true,
      finalResult,
    }
  }

  // Avanca para proxima fase
  await supabase
    .from('dungeon_sessions')
    .update({
      current_phase: session.current_phase + 1,
      phase_log: newLog as unknown as never,
    })
    .eq('id', sessionId)

  return {
    success: true,
    phaseResult: {
      phase: session.current_phase,
      narrative,
      groupPower,
      difficulty: phaseDifficulty,
      success: phaseSuccess,
      casualties,
    },
    dungeonFinished: false,
  }
}

/**
 * Finaliza dungeon, distribui recompensas e restaura vitais.
 */
async function finishDungeon(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  result: DungeonResult
): Promise<void> {
  const { data: session } = await supabase
    .from('dungeon_sessions')
    .select('*, dungeon_types(base_xp_reward, base_libras_reward, loot_table, name)')
    .eq('id', sessionId)
    .single()
  if (!session) return

  const dungeonType = session.dungeon_types as Record<string, unknown>
  const difficulty = session.difficulty as DungeonDifficulty
  const multiplier = DIFFICULTY_MULTIPLIERS[difficulty]

  const baseXp = (dungeonType.base_xp_reward as number) ?? 100
  const baseLibras = (dungeonType.base_libras_reward as number) ?? 50

  // Multiplicador por resultado
  const resultMultiplier = result === 'success' ? 1.0 : result === 'partial' ? 0.5 : 0.1

  const xpReward = Math.floor(baseXp * multiplier * resultMultiplier)
  const librasReward = Math.floor(baseLibras * multiplier * resultMultiplier)

  // Distribui recompensas aos sobreviventes
  const { data: allParticipants } = await supabase
    .from('dungeon_participants')
    .select('character_id, status')
    .eq('session_id', sessionId)

  const survivors = (allParticipants ?? []).filter((p) => p.status === 'active')

  for (const participant of survivors) {
    // XP (com level up automático)
    await grantXp(participant.character_id, xpReward, supabase)

    // Libras
    const { data: wallet } = await supabase
      .from('character_wallet')
      .select('libras')
      .eq('character_id', participant.character_id)
      .single()
    if (wallet) {
      await supabase
        .from('character_wallet')
        .update({ libras: wallet.libras + librasReward })
        .eq('character_id', participant.character_id)
    }

    // Registra recompensa
    await supabase.from('dungeon_rewards').insert({
      session_id: sessionId,
      character_id: participant.character_id,
      xp_granted: xpReward,
      libras_granted: librasReward,
      items_granted: [],
    })

    // Marca como survived
    await supabase
      .from('dungeon_participants')
      .update({ status: 'survived' })
      .eq('session_id', sessionId)
      .eq('character_id', participant.character_id)

    // Restaura vitais
    await supabase.rpc('restore_combat_vitals', {
      p_character_id: participant.character_id,
    })
  }

  // Restaura vitais dos fallen tambem (sem recompensa)
  const fallen = (allParticipants ?? []).filter((p) => p.status === 'fallen')
  for (const p of fallen) {
    await supabase.rpc('restore_combat_vitals', { p_character_id: p.character_id })
  }

  // Finaliza sessao
  await supabase
    .from('dungeon_sessions')
    .update({
      status: result === 'failure' ? 'failed' : 'finished',
      result,
      finished_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  await createEvent(supabase, {
    type: 'dungeon_finished',
    actorId: session.leader_id as string,
    metadata: {
      session_id: sessionId,
      dungeon_name: dungeonType.name,
      result,
      difficulty: session.difficulty,
      survivors: survivors.length,
    },
    isPublic: true,
    narrativeText: `Dungeon ${dungeonType.name as string} encerrada — ${
      result === 'success' ? 'vitoria total' :
      result === 'partial' ? 'vitoria parcial' :
      'derrota'
    }.`,
  })

  // Drop de Fragmentos de Maestria (difícil: 10% x1, lendária: 25% x2)
  const difficulty = session.difficulty as string
  const fragmentChance = difficulty === 'lendario' ? 0.25 : difficulty === 'dificil' ? 0.1 : 0
  const fragmentAmount = difficulty === 'lendario' ? 2 : 1

  if (fragmentChance > 0 && result !== 'failure' && Math.random() < fragmentChance) {
    for (const participant of survivors) {
      const { data: existingFrag } = await supabase
        .from('maestria_fragments')
        .select('id, quantity')
        .eq('character_id', participant.character_id)
        .eq('fragment_type', 'prestígio')
        .maybeSingle()

      if (existingFrag) {
        await supabase
          .from('maestria_fragments')
          .update({ quantity: existingFrag.quantity + fragmentAmount })
          .eq('id', existingFrag.id)
      } else {
        await supabase
          .from('maestria_fragments')
          .insert({
            character_id: participant.character_id,
            fragment_type: 'prestígio',
            quantity: fragmentAmount,
          })
      }
    }
  }
}

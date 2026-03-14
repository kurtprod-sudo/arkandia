import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'

export type TroopType = 'infantaria' | 'cavalaria' | 'arquearia' | 'cerco'
export type WarSide = 'attacker' | 'defender'

// Triângulo de counters — GDD_Sistemas §2
// Cavalaria > Infantaria > Arquearia > Cavalaria
// Cerco é efetivo contra estruturas
const COUNTER_MULTIPLIERS: Record<TroopType, Partial<Record<TroopType, number>>> = {
  cavalaria:  { infantaria: 1.5 },
  infantaria: { arquearia: 1.5 },
  arquearia:  { cavalaria: 1.5 },
  cerco:      {},
}

// Poder base por tipo de tropa
const BASE_POWER: Record<TroopType, number> = {
  infantaria: 10,
  cavalaria:  15,
  arquearia:  12,
  cerco:      8,
}

// Custo de recrutamento em Libras do cofre
const RECRUITMENT_COST: Record<TroopType, number> = {
  infantaria: 30,
  cavalaria:  80,
  arquearia:  50,
  cerco:      130,
}

/**
 * Calcula poder militar total de uma composição de tropas
 * contra uma composição inimiga específica.
 * Aplica counters do triângulo.
 */
export function calculateMilitaryPower(
  ownTroops: Partial<Record<TroopType, number>>,
  enemyTroops: Partial<Record<TroopType, number>>
): number {
  let totalPower = 0

  for (const [type, quantity] of Object.entries(ownTroops) as [TroopType, number][]) {
    if (!quantity || quantity <= 0) continue

    let typePower = BASE_POWER[type] * quantity

    // Aplica bônus de counter
    for (const [enemyType, enemyQty] of Object.entries(enemyTroops) as [TroopType, number][]) {
      if (!enemyQty || enemyQty <= 0) continue
      const counterMult = COUNTER_MULTIPLIERS[type]?.[enemyType] ?? 1.0
      if (counterMult > 1.0) {
        const counterBonus = BASE_POWER[type] * Math.min(quantity, enemyQty) * (counterMult - 1.0)
        typePower += counterBonus
      }
    }

    totalPower += typePower
  }

  return Math.floor(totalPower)
}

/**
 * Declara guerra contra um território.
 * Valida: declarante é Sociedade, território não tem safezone,
 * território é controlado pelo defensor.
 * Referência: GDD_Sistemas §2
 */
export async function declareWar(
  attackerSocietyId: string,
  targetTerritoryId: string,
  userId: string
): Promise<{ success: boolean; error?: string; warId?: string }> {
  const supabase = await createClient()

  // Verifica que usuário é líder ou general do atacante
  const { data: character } = await supabase
    .from('characters')
    .select('id, name')
    .eq('user_id', userId)
    .eq('society_id', attackerSocietyId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: membership } = await supabase
    .from('society_members')
    .select('role')
    .eq('society_id', attackerSocietyId)
    .eq('character_id', character.id)
    .single()
  if (!['leader', 'officer'].includes(membership?.role ?? '')) {
    return { success: false, error: 'Apenas Líder ou General pode declarar guerra.' }
  }

  // Busca território alvo
  const { data: territory } = await supabase
    .from('territories')
    .select('id, name, controlling_society_id, safezone_until')
    .eq('id', targetTerritoryId)
    .single()
  if (!territory) return { success: false, error: 'Território não encontrado.' }

  // Verifica safezone
  if (territory.safezone_until) {
    const safezoneUntil = new Date(territory.safezone_until)
    if (safezoneUntil > new Date()) {
      return {
        success: false,
        error: `Território em safezone até ${safezoneUntil.toLocaleString('pt-BR')}.`,
      }
    }
  }

  // Não pode declarar guerra a si mesmo
  if (territory.controlling_society_id === attackerSocietyId) {
    return { success: false, error: 'Este território já é seu.' }
  }

  // Verifica se já existe guerra ativa para este território
  const { data: existingWar } = await supabase
    .from('war_declarations')
    .select('id')
    .eq('target_territory_id', targetTerritoryId)
    .in('status', ['preparation', 'active'])
    .maybeSingle()
  if (existingWar) {
    return { success: false, error: 'Já existe uma guerra ativa para este território.' }
  }

  const defenderSocietyId = territory.controlling_society_id

  // Fase de preparação: 24 horas
  const preparationEnds = new Date()
  preparationEnds.setHours(preparationEnds.getHours() + 24)

  const { data: war, error } = await supabase
    .from('war_declarations')
    .insert({
      attacker_id: attackerSocietyId,
      defender_id: defenderSocietyId,
      target_territory_id: targetTerritoryId,
      status: 'preparation',
      phase: 1,
      preparation_ends: preparationEnds.toISOString(),
    })
    .select()
    .single()

  if (error || !war) return { success: false, error: 'Erro ao declarar guerra.' }

  // Busca nomes para o evento
  const { data: attacker } = await supabase
    .from('societies')
    .select('name')
    .eq('id', attackerSocietyId)
    .single()

  let defenderName = 'território desprotegido'
  if (defenderSocietyId) {
    const { data: defender } = await supabase
      .from('societies')
      .select('name')
      .eq('id', defenderSocietyId)
      .single()
    defenderName = defender?.name ?? 'Defensor'
  }

  const narrativeText = defenderSocietyId
    ? `${attacker?.name ?? 'Atacante'} declarou guerra a ${defenderName} pelo território ${territory.name}.`
    : `${attacker?.name ?? 'Atacante'} avança sobre o território desprotegido ${territory.name}.`

  await createEvent(supabase, {
    type: 'war_declared',
    actorId: character.id,
    metadata: {
      war_id: war.id,
      attacker_id: attackerSocietyId,
      defender_id: defenderSocietyId,
      territory_id: targetTerritoryId,
      territory_name: territory.name,
    },
    isPublic: true,
    narrativeText,
  })

  return { success: true, warId: war.id }
}

/**
 * Recruta tropas para uma Sociedade.
 * Debita do cofre da Sociedade.
 * Tropas perdidas são permanentes.
 */
export async function recruitTroops(
  societyId: string,
  userId: string,
  troopType: TroopType,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  if (quantity <= 0) return { success: false, error: 'Quantidade inválida.' }

  // Verifica líder ou general
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)
    .eq('society_id', societyId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: membership } = await supabase
    .from('society_members')
    .select('role')
    .eq('society_id', societyId)
    .eq('character_id', character.id)
    .single()
  if (!['leader', 'officer'].includes(membership?.role ?? '')) {
    return { success: false, error: 'Apenas Líder ou General pode recrutar tropas.' }
  }

  // Custo total
  const totalCost = RECRUITMENT_COST[troopType] * quantity
  const { data: society } = await supabase
    .from('societies')
    .select('treasury_libras, level')
    .eq('id', societyId)
    .single()
  if (!society) return { success: false, error: 'Sociedade não encontrada.' }
  if ((society.treasury_libras ?? 0) < totalCost) {
    return { success: false, error: `Cofre insuficiente. Custo: ${totalCost} Libras.` }
  }

  // Debita do cofre
  await supabase
    .from('societies')
    .update({ treasury_libras: (society.treasury_libras ?? 0) - totalCost })
    .eq('id', societyId)

  // Upsert de tropas
  const { data: existing } = await supabase
    .from('troops')
    .select('id, quantity')
    .eq('society_id', societyId)
    .eq('troop_type', troopType)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('troops')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('troops')
      .insert({ society_id: societyId, troop_type: troopType, quantity })
  }

  return { success: true }
}

/**
 * Resolve uma batalha idle dentro de uma guerra.
 * Calcula poder, aplica counters, gera baixas, determina vencedor da fase.
 * Referência: GDD_Sistemas §2.4
 */
export async function resolveBattle(
  warId: string
): Promise<{ success: boolean; error?: string; winnerSide?: WarSide }> {
  const supabase = await createClient()

  const { data: war } = await supabase
    .from('war_declarations')
    .select('*, territories(name)')
    .eq('id', warId)
    .eq('status', 'active')
    .single()
  if (!war) return { success: false, error: 'Guerra não encontrada ou não está ativa.' }

  // Busca participantes e tropas comprometidas
  const { data: participants } = await supabase
    .from('war_participants')
    .select('side, troops_committed, character_id')
    .eq('war_id', warId)

  // Agrega tropas por lado
  const attackerTroops: Partial<Record<TroopType, number>> = {}
  const defenderTroops: Partial<Record<TroopType, number>> = {}

  for (const p of participants ?? []) {
    const troops = p.troops_committed as Partial<Record<TroopType, number>>
    const target = p.side === 'attacker' ? attackerTroops : defenderTroops
    for (const [type, qty] of Object.entries(troops) as [TroopType, number][]) {
      target[type] = (target[type] ?? 0) + (qty ?? 0)
    }
  }

  // Calcula poder com counters
  const attackerPower = calculateMilitaryPower(attackerTroops, defenderTroops)
  const defenderPower = calculateMilitaryPower(defenderTroops, attackerTroops)

  // Determina vencedor da batalha (aleatoriedade baseada em poder relativo)
  const totalPower = attackerPower + defenderPower
  const roll = Math.random() * totalPower
  let winnerSide: WarSide | 'draw'

  if (totalPower === 0 || Math.abs(attackerPower - defenderPower) < totalPower * 0.05) {
    winnerSide = 'draw'
  } else if (roll <= attackerPower) {
    winnerSide = 'attacker'
  } else {
    winnerSide = 'defender'
  }

  // Calcula baixas (perdedores perdem mais)
  const baseCasualtyRate = 0.15
  const loserCasualtyRate = 0.30
  const casualties: Record<string, Record<string, number>> = {
    attacker: {},
    defender: {},
  }

  const attackerRate = winnerSide === 'attacker' ? baseCasualtyRate : loserCasualtyRate
  const defenderRate = winnerSide === 'defender' ? baseCasualtyRate : loserCasualtyRate

  for (const [type, qty] of Object.entries(attackerTroops) as [TroopType, number][]) {
    casualties.attacker[type] = Math.ceil((qty ?? 0) * attackerRate)
  }
  for (const [type, qty] of Object.entries(defenderTroops) as [TroopType, number][]) {
    casualties.defender[type] = Math.ceil((qty ?? 0) * defenderRate)
  }

  // Aplica baixas às tropas — PERMANENTES
  for (const p of participants ?? []) {
    const side = p.side as WarSide
    const sideCasualties = casualties[side]
    const { data: charSociety } = await supabase
      .from('characters')
      .select('society_id')
      .eq('id', p.character_id)
      .single()
    if (!charSociety?.society_id) continue

    for (const [type, loss] of Object.entries(sideCasualties)) {
      const { data: troopRow } = await supabase
        .from('troops')
        .select('id, quantity')
        .eq('society_id', charSociety.society_id)
        .eq('troop_type', type)
        .maybeSingle()
      if (troopRow) {
        const newQty = Math.max(0, troopRow.quantity - loss)
        await supabase
          .from('troops')
          .update({ quantity: newQty })
          .eq('id', troopRow.id)
      }
    }
  }

  // Registra a batalha
  const territory = war.territories as Record<string, unknown> | null
  const narrativeText = winnerSide === 'draw'
    ? `Batalha inconclusiva em ${territory?.name ?? 'território'}. Ambos os lados recuam.`
    : `${winnerSide === 'attacker' ? 'Atacantes vencem' : 'Defensores resistem'} a batalha em ${territory?.name ?? 'território'}.`

  await supabase.from('war_battles').insert({
    war_id: warId,
    phase: war.phase,
    status: 'finished',
    attacker_power: attackerPower,
    defender_power: defenderPower,
    winner_side: winnerSide,
    casualties,
    narrative_text: narrativeText,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  })

  // Avança fase ou encerra guerra
  const NEW_PHASE = war.phase + 1
  const WAR_ENDS_AFTER_PHASES = 3

  if (NEW_PHASE > WAR_ENDS_AFTER_PHASES) {
    // Encerra guerra — maioria de vitórias decide
    const { data: battles } = await supabase
      .from('war_battles')
      .select('winner_side')
      .eq('war_id', warId)
      .eq('status', 'finished')

    const attackerWins = (battles ?? []).filter((b) => b.winner_side === 'attacker').length
    const defenderWins = (battles ?? []).filter((b) => b.winner_side === 'defender').length
    const finalWinner = attackerWins > defenderWins ? 'attacker' : 'defender'
    const winnerId = finalWinner === 'attacker' ? war.attacker_id : war.defender_id

    await supabase
      .from('war_declarations')
      .update({
        status: 'finished',
        winner_id: winnerId,
        finished_at: new Date().toISOString(),
      })
      .eq('id', warId)

    // Transfere território ao vencedor
    if (finalWinner === 'attacker') {
      const safezoneUntil = new Date()
      safezoneUntil.setHours(safezoneUntil.getHours() + 48)
      await supabase
        .from('territories')
        .update({
          controlling_society_id: war.attacker_id,
          safezone_until: safezoneUntil.toISOString(),
        })
        .eq('id', war.target_territory_id)

      await supabase
        .from('territory_production')
        .upsert({
          territory_id: war.target_territory_id,
          society_id: war.attacker_id,
          last_collected: new Date().toISOString(),
          reinvestment_level: 0,
        }, { onConflict: 'territory_id' })
    }

    await createEvent(supabase, {
      type: 'war_finished',
      actorId: undefined,
      metadata: { war_id: warId, winner_id: winnerId, territory_id: war.target_territory_id },
      isPublic: true,
      narrativeText: `A guerra pelo território terminou. ${finalWinner === 'attacker' ? 'Atacantes' : 'Defensores'} vencem.`,
    })
  } else {
    // Avança para próxima fase
    await supabase
      .from('war_declarations')
      .update({ phase: NEW_PHASE })
      .eq('id', warId)
  }

  return { success: true, winnerSide: winnerSide === 'draw' ? 'attacker' : winnerSide }
}

/**
 * Compromete tropas de um personagem em uma guerra.
 */
export async function commitTroops(
  warId: string,
  characterId: string,
  userId: string,
  troops: Partial<Record<TroopType, number>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id, society_id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: war } = await supabase
    .from('war_declarations')
    .select('attacker_id, defender_id, status')
    .eq('id', warId)
    .single()
  if (!war) return { success: false, error: 'Guerra não encontrada.' }
  if (!['preparation', 'active'].includes(war.status)) {
    return { success: false, error: 'Guerra não está em fase de preparação ou ativa.' }
  }

  // Verifica que pertence a um dos lados
  const mySocietyId = character.society_id
  if (!mySocietyId || (mySocietyId !== war.attacker_id && mySocietyId !== war.defender_id)) {
    return { success: false, error: 'Sua Sociedade não participa desta guerra.' }
  }

  const side: WarSide = war.attacker_id === mySocietyId ? 'attacker' : 'defender'

  await supabase
    .from('war_participants')
    .upsert({
      war_id: warId,
      society_id: mySocietyId,
      character_id: characterId,
      troops_committed: troops,
      side,
    }, { onConflict: 'war_id,character_id' })

  return { success: true }
}

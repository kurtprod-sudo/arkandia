// ---------------------------------------------------------------------------
// Sistema de Missões PvE (Hunting) — Fase 21
// Referência: GDD_Balanceamento §16, GDD_Sistemas §1.11
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { calcSkillDamage, calcDodgeChance } from './attributes'
import { createEvent } from './events'
import { createNotification } from './notifications'
import { grantXp } from './levelup'

const AUTO_MAX_KILLS = 20        // Limite de kills no Modo Auto
const ZONE_COOLDOWN_MINUTES = 30 // Minutos de espera entre zonas

export type HuntingMode = 'manual' | 'auto'

export interface NpcState {
  id: string
  name: string
  tier: string
  hp: number
  hpMax: number
  ataque: number
  magia: number
  defesa: number
  velocidade: number
  eter: number
  eterMax: number
  skills: NpcSkill[]
  behavior: string
  killNumber: number
}

export interface NpcSkill {
  name: string
  base: number
  ataque_factor?: number
  magia_factor?: number
  eter_cost: number
  cooldown: number
  effect_type?: string
  effect_duration?: number
  type?: 'heal' | 'buff' | 'damage'
  is_true_damage?: boolean
}

export interface HuntingTurnResult {
  actor: 'player' | 'npc'
  actionType: string
  damageDealt: number
  effectApplied: string | null
  narrativeText: string
  playerHpAfter: number
  npcHpAfter: number
  npcDefeated: boolean
  playerDefeated: boolean
  lootDrop?: LootDrop[]
}

export interface LootDrop {
  type: 'libras' | 'xp' | 'essencia' | 'item'
  amount?: number
  itemName?: string
}

/**
 * Inicia uma sessão de hunting em uma zona.
 * Valida: personagem não está em recuperação, zona existe e nível é adequado,
 * não está em outra sessão ativa, cooldown de zona respeitado.
 */
export async function startHuntingSession(
  characterId: string,
  userId: string,
  zoneId: string,
  mode: HuntingMode
): Promise<{ success: boolean; error?: string; sessionId?: string; firstNpc?: NpcState }> {
  const supabase = await createClient()

  // Verifica ownership e estado
  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level, recovery_until, injured_until')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  if (character.recovery_until && new Date(character.recovery_until) > new Date()) {
    return { success: false, error: 'Personagem em recuperação.' }
  }
  if (character.injured_until && new Date(character.injured_until) > new Date()) {
    return { success: false, error: 'Personagem ferido.' }
  }

  // Verifica sessão ativa
  const { data: activeSession } = await supabase
    .from('hunting_sessions')
    .select('id')
    .eq('character_id', characterId)
    .eq('status', 'active')
    .maybeSingle()
  if (activeSession) return { success: false, error: 'Você já está em uma zona de caça.' }

  // Verifica cooldown da zona (última sessão encerrada nessa zona)
  const { data: lastSession } = await supabase
    .from('hunting_sessions')
    .select('finished_at')
    .eq('character_id', characterId)
    .eq('zone_id', zoneId)
    .neq('status', 'active')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastSession?.finished_at) {
    const finishedAt = new Date(lastSession.finished_at)
    const cooldownMs = ZONE_COOLDOWN_MINUTES * 60 * 1000
    const canEnterAt = new Date(finishedAt.getTime() + cooldownMs)
    if (canEnterAt > new Date()) {
      const minutesLeft = Math.ceil((canEnterAt.getTime() - Date.now()) / 60000)
      return {
        success: false,
        error: `Zona em cooldown. Aguarde ${minutesLeft} minutos ou use uma Poção de Cura.`,
      }
    }
  }

  // Verifica zona e nível
  const { data: zone } = await supabase
    .from('hunting_zones')
    .select('*')
    .eq('id', zoneId)
    .eq('is_active', true)
    .single()
  if (!zone) return { success: false, error: 'Zona não encontrada.' }

  if (character.level < zone.min_level) {
    return { success: false, error: `Nível ${zone.min_level} necessário para esta zona.` }
  }
  if (zone.max_level && character.level > zone.max_level) {
    return { success: false, error: 'Nível muito alto para esta zona — pouco desafio.' }
  }

  // Sorteia o primeiro NPC da zona
  const firstNpc = await spawnNpc(supabase, zoneId, 1)
  if (!firstNpc) return { success: false, error: 'Nenhum NPC disponível nesta zona.' }

  // Cria sessão
  const { data: session, error } = await supabase
    .from('hunting_sessions')
    .insert({
      character_id: characterId,
      zone_id: zoneId,
      mode,
      status: 'active',
      kills: 0,
      max_kills: mode === 'auto' ? AUTO_MAX_KILLS : 9999,
      loot_accumulated: [],
      xp_accumulated: 0,
      libras_accumulated: 0,
      essencia_accumulated: 0,
      current_npc_id: firstNpc.id,
      current_npc_hp: firstNpc.hpMax,
    })
    .select()
    .single()

  if (error || !session) return { success: false, error: 'Erro ao iniciar sessão.' }

  return { success: true, sessionId: session.id, firstNpc }
}

/**
 * Processa uma ação do jogador contra o NPC atual.
 * Após a ação do jogador, NPC responde automaticamente.
 * Se NPC for derrotado: calcula loot, spawna próximo ou encerra sessão.
 * Se jogador for derrotado: perde TODO o loot acumulado.
 */
export async function processHuntingAction(
  sessionId: string,
  userId: string,
  action: { type: 'ataque_basico' | 'skill'; skillName?: string }
): Promise<{ success: boolean; error?: string; turnResult?: HuntingTurnResult; sessionFinished?: boolean }> {
  const supabase = await createClient()

  // Busca sessão
  const { data: session } = await supabase
    .from('hunting_sessions')
    .select('*, hunting_zones(name)')
    .eq('id', sessionId)
    .eq('status', 'active')
    .single()
  if (!session) return { success: false, error: 'Sessão não encontrada.' }

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', session.character_id)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  // Busca NPC atual
  const { data: npcType } = await supabase
    .from('npc_types')
    .select('*')
    .eq('id', session.current_npc_id as string)
    .single()
  if (!npcType) return { success: false, error: 'NPC não encontrado.' }

  // Busca atributos do jogador
  const { data: playerAttrs } = await supabase
    .from('character_attributes')
    .select('*')
    .eq('character_id', character.id)
    .single()
  if (!playerAttrs) return { success: false, error: 'Atributos não encontrados.' }

  const npcSkills = (npcType.skills as unknown as NpcSkill[]) ?? []

  // Estado atual do NPC
  const npcCurrentHp = session.current_npc_hp as number
  const npcHpMax = npcType.base_hp as number
  const npcAtaque = npcType.base_ataque as number
  const npcMagia = npcType.base_magia as number
  const npcDefesa = npcType.base_defesa as number
  const npcVelocidade = npcType.base_velocidade as number

  // ── TURNO DO JOGADOR ──────────────────────────────────────────────────────
  let playerDamage = 0
  let playerNarrative = ''

  if (action.type === 'ataque_basico') {
    const dodgeChance = calcDodgeChance(npcVelocidade)
    if (Math.random() * 100 <= dodgeChance) {
      playerNarrative = 'Ataque básico desviado.'
    } else {
      const result = calcSkillDamage({
        baseDamage: 8,
        ataqueFactor: 0.6,
        attackerAtaque: playerAttrs.ataque,
        attackerMagia: playerAttrs.magia,
        targetDefesa: npcDefesa,
      })
      playerDamage = Math.floor(result.afterDefense)
      playerNarrative = `Ataque básico: ${playerDamage} de dano.`
    }
  } else if (action.type === 'skill' && action.skillName) {
    // Busca a skill na building do jogador pelo nome
    const { data: allSlots } = await supabase
      .from('character_building')
      .select('skills(id, name, formula, eter_cost)')
      .eq('character_id', character.id)

    const matchingSlot = (allSlots ?? []).find(
      (s) => (s.skills as Record<string, unknown> | null)?.name === action.skillName
    )

    if (!matchingSlot?.skills) {
      return { success: false, error: 'Skill não encontrada na Building.' }
    }

    const skill = matchingSlot.skills as Record<string, unknown>
    const formula = (skill.formula ?? {}) as Record<string, number>
    const eterCost = (skill.eter_cost as number) ?? 0

    if (playerAttrs.eter_atual < eterCost) {
      return { success: false, error: 'Éter insuficiente.' }
    }

    const dodgeChance = calcDodgeChance(npcVelocidade)
    if (Math.random() * 100 <= dodgeChance && !formula.is_true_damage) {
      playerNarrative = `${skill.name as string} desviada.`
    } else {
      const result = calcSkillDamage({
        baseDamage: formula.base ?? 0,
        ataqueFactor: formula.ataque_factor,
        magiaFactor: formula.magia_factor,
        attackerAtaque: playerAttrs.ataque,
        attackerMagia: playerAttrs.magia,
        targetDefesa: npcDefesa,
        defensePenetration: formula.defense_penetration_percent,
        isTrueDamage: !!formula.is_true_damage,
      })
      playerDamage = Math.floor(result.afterDefense)
      playerNarrative = `${skill.name as string}: ${playerDamage} de dano.`
    }

    // Debita Éter
    await supabase
      .from('character_attributes')
      .update({ eter_atual: playerAttrs.eter_atual - eterCost })
      .eq('character_id', character.id)
    playerAttrs.eter_atual -= eterCost
  }

  const npcHpAfterPlayer = Math.max(0, npcCurrentHp - playerDamage)

  // Registra turno do jogador
  await supabase.from('hunting_combat_turns').insert({
    session_id: sessionId,
    npc_kill_number: (session.kills as number) + 1,
    turn_number: 1,
    actor: 'player',
    action_type: action.type,
    damage_dealt: playerDamage,
    narrative_text: playerNarrative,
  })

  // NPC derrotado?
  if (npcHpAfterPlayer <= 0) {
    return await handleNpcDefeated(supabase, session, character.id, npcType, playerAttrs)
  }

  // ── TURNO DO NPC ──────────────────────────────────────────────────────────
  const npcAction = decideNpcAction(
    npcSkills,
    npcHpAfterPlayer,
    npcHpMax,
    npcType.behavior as string
  )

  let npcDamage = 0
  let npcNarrative = ''

  if (npcAction.type === 'heal') {
    // NPC cura a si mesmo
    const healAmount = npcAction.base ?? 30
    const newNpcHp = Math.min(npcHpMax, npcHpAfterPlayer + healAmount)
    npcNarrative = `${npcType.name}: +${healAmount} HP.`

    await supabase
      .from('hunting_sessions')
      .update({ current_npc_hp: newNpcHp, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    await supabase.from('hunting_combat_turns').insert({
      session_id: sessionId,
      npc_kill_number: (session.kills as number) + 1,
      turn_number: 2,
      actor: 'npc',
      action_type: 'heal',
      damage_dealt: 0,
      narrative_text: npcNarrative,
    })

    return {
      success: true,
      turnResult: {
        actor: 'npc',
        actionType: 'heal',
        damageDealt: 0,
        effectApplied: null,
        narrativeText: `${playerNarrative} ${npcNarrative}`,
        playerHpAfter: playerAttrs.hp_atual,
        npcHpAfter: newNpcHp,
        npcDefeated: false,
        playerDefeated: false,
      },
    }
  }

  // NPC ataca jogador
  const playerDodgeChance = calcDodgeChance(playerAttrs.velocidade)
  if (Math.random() * 100 <= playerDodgeChance) {
    npcNarrative = `${npcType.name} — ataque desviado.`
  } else {
    const result = calcSkillDamage({
      baseDamage: npcAction.base ?? 5,
      ataqueFactor: npcAction.ataque_factor ?? 0,
      magiaFactor: npcAction.magia_factor ?? 0,
      attackerAtaque: npcAtaque,
      attackerMagia: npcMagia,
      targetDefesa: playerAttrs.defesa,
    })
    npcDamage = Math.floor(result.afterDefense)
    npcNarrative = `${npcType.name} — ${npcAction.name}: ${npcDamage} de dano.`
  }

  const playerHpAfter = Math.max(0, playerAttrs.hp_atual - npcDamage)

  // Aplica dano ao jogador
  await supabase
    .from('character_attributes')
    .update({ hp_atual: playerHpAfter })
    .eq('character_id', character.id)

  // Atualiza HP do NPC
  await supabase
    .from('hunting_sessions')
    .update({ current_npc_hp: npcHpAfterPlayer, updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  await supabase.from('hunting_combat_turns').insert({
    session_id: sessionId,
    npc_kill_number: (session.kills as number) + 1,
    turn_number: 2,
    actor: 'npc',
    action_type: npcAction.name,
    damage_dealt: npcDamage,
    effect_applied: npcAction.effect_type ?? null,
    narrative_text: npcNarrative,
  })

  // Jogador morreu?
  if (playerHpAfter <= 0) {
    // Perde TUDO — encerra sessão com status 'died'
    await supabase
      .from('hunting_sessions')
      .update({
        status: 'died',
        loot_accumulated: [],
        xp_accumulated: 0,
        libras_accumulated: 0,
        essencia_accumulated: 0,
        finished_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    // Restaura vitais do jogador
    await supabase.rpc('restore_combat_vitals', { p_character_id: character.id })

    return {
      success: true,
      sessionFinished: true,
      turnResult: {
        actor: 'npc',
        actionType: npcAction.name,
        damageDealt: npcDamage,
        effectApplied: npcAction.effect_type ?? null,
        narrativeText: `${playerNarrative} ${npcNarrative} Você foi derrotado. Todo o loot foi perdido.`,
        playerHpAfter: 0,
        npcHpAfter: npcHpAfterPlayer,
        npcDefeated: false,
        playerDefeated: true,
      },
    }
  }

  return {
    success: true,
    turnResult: {
      actor: 'npc',
      actionType: npcAction.name,
      damageDealt: npcDamage,
      effectApplied: npcAction.effect_type ?? null,
      narrativeText: `${playerNarrative} ${npcNarrative}`,
      playerHpAfter,
      npcHpAfter: npcHpAfterPlayer,
      npcDefeated: false,
      playerDefeated: false,
    },
  }
}

/**
 * Processa um turno automático (Modo Auto).
 * Personagem usa a skill de maior dano disponível ou Ataque Básico.
 */
export async function processAutoTurn(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; turnResult?: HuntingTurnResult; sessionFinished?: boolean }> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('hunting_sessions')
    .select('character_id, kills, max_kills')
    .eq('id', sessionId)
    .eq('status', 'active')
    .single()
  if (!session) return { success: false, error: 'Sessão não encontrada.' }

  // Verifica limite de kills no modo auto
  if ((session.kills as number) >= (session.max_kills as number)) {
    return await collectAndExit(sessionId, userId)
  }

  // Busca a melhor skill disponível na building do personagem
  const { data: buildingSlots } = await supabase
    .from('character_building')
    .select('skills(name, formula, eter_cost, skill_type)')
    .eq('character_id', session.character_id)

  const { data: playerAttrs } = await supabase
    .from('character_attributes')
    .select('eter_atual')
    .eq('character_id', session.character_id)
    .single()

  // Encontra skill ativa de maior dano que o personagem pode usar
  let bestSkillName: string | undefined
  let bestSkillDamageScore = 0

  for (const slot of buildingSlots ?? []) {
    const skill = slot.skills as Record<string, unknown> | null
    if (!skill || skill.skill_type !== 'ativa') continue
    const formula = (skill.formula as Record<string, number>) ?? {}
    const eterCost = (skill.eter_cost as number) ?? 0
    if ((playerAttrs?.eter_atual ?? 0) < eterCost) continue
    const score = (formula.base ?? 0) + (formula.ataque_factor ?? 0) * 10 + (formula.magia_factor ?? 0) * 10
    if (score > bestSkillDamageScore) {
      bestSkillDamageScore = score
      bestSkillName = skill.name as string
    }
  }

  return processHuntingAction(sessionId, userId, {
    type: bestSkillName ? 'skill' : 'ataque_basico',
    skillName: bestSkillName,
  })
}

/**
 * Encerra a sessão voluntariamente e concede o loot acumulado.
 */
export async function collectAndExit(
  sessionId: string,
  userId: string
): Promise<{
  success: boolean
  error?: string
  sessionFinished?: boolean
  totalRewards?: { xp: number; libras: number; essencia: number; items: string[] }
}> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('hunting_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('status', 'active')
    .single()
  if (!session) return { success: false, error: 'Sessão não encontrada.' }

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id, xp, level')
    .eq('id', session.character_id)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  const xp = session.xp_accumulated as number
  const libras = session.libras_accumulated as number
  const essencia = session.essencia_accumulated as number
  const lootItems = (session.loot_accumulated as Array<{ itemName: string }>) ?? []

  // Concede recompensas
  await grantSessionRewards(supabase, character.id, xp, libras, essencia)

  // Restaura vitais
  await supabase.rpc('restore_combat_vitals', { p_character_id: character.id })

  // Encerra sessão
  await supabase
    .from('hunting_sessions')
    .update({
      status: 'finished',
      finished_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  await createEvent(supabase, {
    type: 'hunting_completed',
    actorId: character.id,
    metadata: {
      session_id: sessionId,
      kills: session.kills,
      xp,
      libras,
      essencia,
    },
    isPublic: false,
    narrativeText: `${session.kills as number} criaturas abatidas. +${xp} XP, +${libras} Libras.`,
  })

  await createNotification({
    characterId: character.id,
    type: 'hunting_done',
    title: 'Hunting concluído',
    body: `${session.kills as number} criaturas abatidas. +${xp} XP, +${libras} Libras.`,
    actionUrl: '/battle',
  })

  return {
    success: true,
    sessionFinished: true,
    totalRewards: {
      xp,
      libras,
      essencia,
      items: lootItems.map((i) => i.itemName),
    },
  }
}

/**
 * Usa Poção de Cura para resetar o cooldown da zona.
 */
export async function applyHealingPotion(
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
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Busca Poção de Cura no inventário
  const { data: potionItems } = await supabase
    .from('inventory')
    .select('id, quantity, items!inner(name)')
    .eq('character_id', characterId)

  const potion = (potionItems ?? []).find(
    (p) => (p.items as Record<string, unknown>)?.name === 'Poção de Cura'
  )

  if (!potion || potion.quantity < 1) {
    return { success: false, error: 'Sem Poção de Cura no inventário.' }
  }

  // Consome 1 poção
  if (potion.quantity === 1) {
    await supabase.from('inventory').delete().eq('id', potion.id)
  } else {
    await supabase
      .from('inventory')
      .update({ quantity: potion.quantity - 1 })
      .eq('id', potion.id)
  }

  return { success: true }
}

/**
 * Retorna zonas de caça disponíveis para o nível do personagem.
 */
export async function getAvailableZones(characterLevel: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('hunting_zones')
    .select('*')
    .eq('is_active', true)
    .lte('min_level', characterLevel)
    .order('min_level')
  return data ?? []
}

/**
 * Retorna a sessão de hunting ativa do personagem, se houver.
 */
export async function getActiveHuntingSession(characterId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('hunting_sessions')
    .select('*, hunting_zones(name, description, location, risk_level)')
    .eq('character_id', characterId)
    .eq('status', 'active')
    .maybeSingle()
  return data
}

// ─── HELPERS INTERNOS ────────────────────────────────────────────────────────

/**
 * Sorteia um NPC da zona aleatoriamente.
 */
async function spawnNpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  zoneId: string,
  killNumber: number
): Promise<NpcState | null> {
  const { data: npcs } = await supabase
    .from('npc_types')
    .select('*')
    .eq('zone_id', zoneId)

  if (!npcs || npcs.length === 0) return null

  const npc = npcs[Math.floor(Math.random() * npcs.length)]

  return {
    id: npc.id,
    name: npc.name,
    tier: npc.tier,
    hp: npc.base_hp,
    hpMax: npc.base_hp,
    ataque: npc.base_ataque,
    magia: npc.base_magia,
    defesa: npc.base_defesa,
    velocidade: npc.base_velocidade,
    eter: npc.base_eter,
    eterMax: npc.base_eter,
    skills: (npc.skills as unknown as NpcSkill[]) ?? [],
    behavior: npc.behavior,
    killNumber,
  }
}

/**
 * IA do NPC: decide ação baseada em HP atual e behavior.
 * Referência: GDD_Balanceamento §16
 */
function decideNpcAction(
  skills: NpcSkill[],
  currentHp: number,
  maxHp: number,
  behavior: string
): NpcSkill & { name: string; base: number } {
  const hpPercent = currentHp / maxHp

  // Se HP < 30% e tem skill de cura: cura
  if (hpPercent < 0.3) {
    const healSkill = skills.find((s) => s.type === 'heal')
    if (healSkill) return { ...healSkill, name: healSkill.name, base: healSkill.base ?? 30 }
  }

  // Filtra skills de dano disponíveis
  const damageSkills = skills.filter(
    (s) => !s.type || s.type === 'damage' || (!s.type && (s.ataque_factor || s.magia_factor))
  )

  if (damageSkills.length === 0) {
    return { name: 'Ataque Básico', base: 5, ataque_factor: 0.6, eter_cost: 0, cooldown: 0 }
  }

  // Aggressive: usa skill de maior dano
  if (behavior === 'aggressive') {
    const strongest = damageSkills.reduce((a, b) =>
      ((a.base ?? 0) + (a.ataque_factor ?? 0) * 10 + (a.magia_factor ?? 0) * 10) >
      ((b.base ?? 0) + (b.ataque_factor ?? 0) * 10 + (b.magia_factor ?? 0) * 10)
        ? a : b
    )
    return { ...strongest, name: strongest.name, base: strongest.base ?? 5 }
  }

  // Balanced/Defensive: usa skill aleatória
  const chosen = damageSkills[Math.floor(Math.random() * damageSkills.length)]
  return { ...chosen, name: chosen.name, base: chosen.base ?? 5 }
}

/**
 * Processa derrota de NPC: calcula loot, spawna próximo ou encerra sessão.
 */
async function handleNpcDefeated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: Record<string, unknown>,
  characterId: string,
  npcType: Record<string, unknown>,
  playerAttrs: Record<string, unknown>
): Promise<{ success: boolean; error?: string; turnResult?: HuntingTurnResult; sessionFinished?: boolean }> {
  const kills = (session.kills as number) + 1
  const maxKills = session.max_kills as number
  const zoneId = session.zone_id as string
  const sessionId = session.id as string

  // Weekly mission: hunting kill
  const { updateWeeklyProgress } = await import('./weekly')
  await updateWeeklyProgress(characterId, 'hunting_kills').catch(() => {})

  // Bestiário: registra derrota do NPC
  const { recordNpcDefeat } = await import('./bestiary')
  await recordNpcDefeat(characterId, npcType.id as string).catch(() => {})

  // Calcula loot do NPC
  const lootTable = (npcType.loot_table as Array<{
    type: string; min?: number; max?: number; amount?: number;
    chance: number; item_name?: string
  }>) ?? []

  let xpGained = 0
  let librasGained = 0
  let essenciaGained = 0
  const itemsDropped: string[] = []
  const lootDrops: LootDrop[] = []

  for (const entry of lootTable) {
    if (Math.random() > entry.chance) continue

    switch (entry.type) {
      case 'xp':
        xpGained += entry.amount ?? (npcType.xp_reward as number) ?? 20
        lootDrops.push({ type: 'xp', amount: xpGained })
        break
      case 'libras': {
        const min = entry.min ?? 5
        const max = entry.max ?? 20
        librasGained += Math.floor(min + Math.random() * (max - min))
        lootDrops.push({ type: 'libras', amount: librasGained })
        break
      }
      case 'essencia':
        essenciaGained += entry.amount ?? 2
        lootDrops.push({ type: 'essencia', amount: essenciaGained })
        break
      case 'item':
        if (entry.item_name) {
          itemsDropped.push(entry.item_name)
          lootDrops.push({ type: 'item', itemName: entry.item_name })
        }
        break
    }
  }

  // Acumula loot na sessão
  const prevLoot = (session.loot_accumulated as Array<{ itemName: string }>) ?? []
  const prevXp = (session.xp_accumulated as number) ?? 0
  const prevLibras = (session.libras_accumulated as number) ?? 0
  const prevEssencia = (session.essencia_accumulated as number) ?? 0

  const sessionMaxReached = kills >= maxKills

  if (sessionMaxReached) {
    await supabase
      .from('hunting_sessions')
      .update({
        kills,
        xp_accumulated: prevXp + xpGained,
        libras_accumulated: prevLibras + librasGained,
        essencia_accumulated: prevEssencia + essenciaGained,
        loot_accumulated: [...prevLoot, ...itemsDropped.map((i) => ({ itemName: i }))] as unknown as never,
        status: 'finished',
        finished_at: new Date().toISOString(),
        current_npc_id: null,
        current_npc_hp: null,
      })
      .eq('id', sessionId)

    await grantSessionRewards(supabase, characterId, prevXp + xpGained, prevLibras + librasGained, prevEssencia + essenciaGained)
    await supabase.rpc('restore_combat_vitals', { p_character_id: characterId })

    return {
      success: true,
      sessionFinished: true,
      turnResult: {
        actor: 'player',
        actionType: 'kill',
        damageDealt: 0,
        effectApplied: null,
        narrativeText: `${npcType.name as string} derrotado. Limite de kills atingido. Recompensas coletadas.`,
        playerHpAfter: playerAttrs.hp_atual as number,
        npcHpAfter: 0,
        npcDefeated: true,
        playerDefeated: false,
        lootDrop: lootDrops,
      },
    }
  }

  // Spawna próximo NPC
  const nextNpc = await spawnNpc(supabase, zoneId, kills + 1)

  await supabase
    .from('hunting_sessions')
    .update({
      kills,
      xp_accumulated: prevXp + xpGained,
      libras_accumulated: prevLibras + librasGained,
      essencia_accumulated: prevEssencia + essenciaGained,
      loot_accumulated: [...prevLoot, ...itemsDropped.map((i) => ({ itemName: i }))] as unknown as never,
      current_npc_id: nextNpc?.id ?? null,
      current_npc_hp: nextNpc?.hpMax ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  return {
    success: true,
    sessionFinished: false,
    turnResult: {
      actor: 'player',
      actionType: 'kill',
      damageDealt: 0,
      effectApplied: null,
      narrativeText: `${npcType.name as string} derrotado! +${xpGained} XP, +${librasGained} Libras${essenciaGained > 0 ? `, +${essenciaGained} Essências` : ''}.`,
      playerHpAfter: playerAttrs.hp_atual as number,
      npcHpAfter: 0,
      npcDefeated: true,
      playerDefeated: false,
      lootDrop: lootDrops,
    },
  }
}

/** Concede XP, Libras e Essências ao personagem */
async function grantSessionRewards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
  xp: number,
  libras: number,
  essencia: number
) {
  // XP (com level up automático)
  if (xp > 0) {
    await grantXp(characterId, xp, supabase)
  }

  if (libras > 0 || essencia > 0) {
    const { data: wallet } = await supabase
      .from('character_wallet')
      .select('libras, essencia')
      .eq('character_id', characterId)
      .single()

    if (wallet) {
      await supabase
        .from('character_wallet')
        .update({
          libras: wallet.libras + libras,
          essencia: wallet.essencia + essencia,
        })
        .eq('character_id', characterId)
    }
  }
}

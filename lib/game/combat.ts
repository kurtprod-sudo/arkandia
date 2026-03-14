// ---------------------------------------------------------------------------
// Sistema de Combate PvP — Fase 9
// Referência: GDD_Sistemas §1
// ---------------------------------------------------------------------------

import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'
import { calcSkillDamage, calcDodgeChance } from './attributes'

// Timer de turno: 60 segundos (decisão canônica)
export const TURN_TIMER_SECONDS = 60

// Essências perdidas por modalidade em derrota
const DEFEAT_ESSENCIA_LOSS: Record<string, number> = {
  duelo_livre:     0,
  duelo_ranqueado: 10,
  emboscada:       20,
  torneio:         10,
}

// Horas de recuperação por modalidade em derrota
const DEFEAT_RECOVERY_HOURS: Record<string, number> = {
  duelo_livre:     0,
  duelo_ranqueado: 2,
  emboscada:       4,
  torneio:         1,
}

export type CombatAction =
  | { type: 'skill'; skillId: string }
  | { type: 'ataque_basico' }
  | { type: 'mudar_range'; rangeState: 'curto' | 'medio' | 'longo' }
  | { type: 'usar_item'; itemId: string }
  | { type: 'fuga' }
  | { type: 'render' }
  | { type: 'timeout' }

export type RangeState = 'curto' | 'medio' | 'longo'

/**
 * Inicia uma nova sessão de combate.
 * Valida: ambos os personagens disponíveis (não em recuperação, não em outro combate).
 */
export async function startCombat(
  challengerId: string,
  defenderId: string,
  modality: 'duelo_livre' | 'duelo_ranqueado' | 'emboscada' | 'torneio',
  userId: string
): Promise<{ success: boolean; error?: string; sessionId?: string }> {
  const supabase = await createClient()

  // Verifica ownership do challenger
  const { data: challenger } = await supabase
    .from('characters')
    .select('id, name, recovery_until, level')
    .eq('id', challengerId)
    .eq('user_id', userId)
    .single()
  if (!challenger) return { success: false, error: 'Personagem não encontrado.' }

  // Verifica recuperação do challenger
  if (challenger.recovery_until) {
    const recoveryUntil = new Date(challenger.recovery_until)
    if (recoveryUntil > new Date()) {
      return {
        success: false,
        error: `Em recuperação até ${recoveryUntil.toLocaleString('pt-BR')}.`,
      }
    }
  }

  // Verifica se challenger já está em combate
  const { data: activeCombat } = await supabase
    .from('combat_sessions')
    .select('id')
    .or(`challenger_id.eq.${challengerId},defender_id.eq.${challengerId}`)
    .eq('status', 'active')
    .maybeSingle()
  if (activeCombat) {
    return { success: false, error: 'Você já está em um combate.' }
  }

  // Verifica recuperação do defender
  const { data: defender } = await supabase
    .from('characters')
    .select('id, name, recovery_until')
    .eq('id', defenderId)
    .single()
  if (!defender) return { success: false, error: 'Oponente não encontrado.' }

  if (defender.recovery_until) {
    const recoveryUntil = new Date(defender.recovery_until)
    if (recoveryUntil > new Date()) {
      return { success: false, error: 'Oponente está em recuperação.' }
    }
  }

  // Determina quem age primeiro (Velocidade)
  const { data: challengerAttrs } = await supabase
    .from('character_attributes')
    .select('velocidade')
    .eq('character_id', challengerId)
    .single()

  const { data: defenderAttrs } = await supabase
    .from('character_attributes')
    .select('velocidade')
    .eq('character_id', defenderId)
    .single()

  const challengerVelocidade = challengerAttrs?.velocidade ?? 0
  const defenderVelocidade = defenderAttrs?.velocidade ?? 0

  let firstPlayerId: string
  if (challengerVelocidade > defenderVelocidade) {
    firstPlayerId = challengerId
  } else if (defenderVelocidade > challengerVelocidade) {
    firstPlayerId = defenderId
  } else {
    firstPlayerId = Math.random() < 0.5 ? challengerId : defenderId
  }

  const turnExpiresAt = new Date()
  turnExpiresAt.setSeconds(turnExpiresAt.getSeconds() + TURN_TIMER_SECONDS)

  // Para duelo_livre e ranqueado: criar como pending (defender precisa aceitar)
  // Para emboscada: criar como active diretamente
  const initialStatus = modality === 'emboscada' ? 'active' : 'pending'

  const { data: session, error } = await supabase
    .from('combat_sessions')
    .insert({
      challenger_id: challengerId,
      defender_id: defenderId,
      modality,
      status: initialStatus,
      current_turn: 1,
      active_player_id: firstPlayerId,
      turn_expires_at: initialStatus === 'active' ? turnExpiresAt.toISOString() : null,
    })
    .select()
    .single()

  if (error || !session) return { success: false, error: 'Erro ao iniciar combate.' }

  await createEvent(supabase, {
    type: 'combat_started',
    actorId: challengerId,
    targetId: defenderId,
    metadata: { session_id: session.id, modality },
    isPublic: true,
    narrativeText: `${challenger.name} desafiou ${defender.name} para um ${modality.replace('_', ' ')}.`,
  })

  return { success: true, sessionId: session.id }
}

/**
 * Aceita um desafio de combate pendente (defender aceita).
 */
export async function acceptCombat(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('combat_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('status', 'pending')
    .single()
  if (!session) return { success: false, error: 'Desafio não encontrado.' }

  // Verifica que é o defender aceitando
  const { data: defender } = await supabase
    .from('characters')
    .select('id')
    .eq('id', session.defender_id)
    .eq('user_id', userId)
    .single()
  if (!defender) return { success: false, error: 'Acesso negado.' }

  const turnExpiresAt = new Date()
  turnExpiresAt.setSeconds(turnExpiresAt.getSeconds() + TURN_TIMER_SECONDS)

  await supabase
    .from('combat_sessions')
    .update({
      status: 'active',
      turn_expires_at: turnExpiresAt.toISOString(),
    })
    .eq('id', sessionId)

  return { success: true }
}

/**
 * Processa uma ação de combate de um jogador.
 * Valida: é o turno do jogador, sessão ativa, ação válida.
 * Aplica dano, efeitos, verifica fim de combate.
 */
export async function processTurn(
  sessionId: string,
  action: CombatAction,
  userId: string
): Promise<{
  success: boolean
  error?: string
  turnResult?: {
    damageDealt: number
    effectApplied: string | null
    combatEnded: boolean
    winnerId: string | null
    narrativeText: string
  }
}> {
  const supabase = await createClient()

  // Busca sessão ativa
  const { data: session } = await supabase
    .from('combat_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('status', 'active')
    .single()
  if (!session) return { success: false, error: 'Sessão de combate não encontrada.' }

  // Verifica que é o turno do jogador
  if (!session.active_player_id) return { success: false, error: 'Nenhum jogador ativo.' }
  const { data: actor } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', session.active_player_id)
    .eq('user_id', userId)
    .single()
  if (!actor) return { success: false, error: 'Não é o seu turno.' }

  const opponentId = session.active_player_id === session.challenger_id
    ? session.defender_id
    : session.challenger_id

  // Busca atributos de ambos
  const [{ data: actorAttrs }, { data: opponentAttrs }] = await Promise.all([
    supabase.from('character_attributes')
      .select('*').eq('character_id', actor.id).single(),
    supabase.from('character_attributes')
      .select('*').eq('character_id', opponentId).single(),
  ])

  if (!actorAttrs || !opponentAttrs) {
    return { success: false, error: 'Erro ao carregar atributos.' }
  }

  let damageDealt = 0
  let effectApplied: string | null = null
  let narrativeText = ''

  // Processa ação
  if (action.type === 'render') {
    // Rendição imediata
    return await finishCombat(supabase, sessionId, opponentId, actor.id, 'render', session.modality)
  }

  if (action.type === 'fuga') {
    // Roll de fuga: Velocidade do ator vs Velocidade do oponente
    const fugaChance = Math.min(
      80,
      50 + (actorAttrs.velocidade - opponentAttrs.velocidade) * 2
    )
    const roll = Math.random() * 100
    if (roll <= fugaChance) {
      // Fuga bem-sucedida — sem consequências
      await supabase
        .from('combat_sessions')
        .update({ status: 'finished', winner_id: null, finished_at: new Date().toISOString() })
        .eq('id', sessionId)

      await recordTurn(supabase, sessionId, session.current_turn, actor.id, 'fuga', 0, null, 'Fuga bem-sucedida.')
      return {
        success: true,
        turnResult: {
          damageDealt: 0,
          effectApplied: null,
          combatEnded: true,
          winnerId: null,
          narrativeText: 'Fuga bem-sucedida.',
        },
      }
    } else {
      // Fuga fracassada — turno consumido
      narrativeText = 'Tentativa de fuga fracassou.'
      await recordTurn(supabase, sessionId, session.current_turn, actor.id, 'fuga', 0, null, narrativeText)
      await advanceTurn(supabase, sessionId, session.current_turn, opponentId)
      return {
        success: true,
        turnResult: {
          damageDealt: 0,
          effectApplied: null,
          combatEnded: false,
          winnerId: null,
          narrativeText,
        },
      }
    }
  }

  if (action.type === 'mudar_range') {
    narrativeText = `Mudou para Range State ${action.rangeState}.`
    await recordTurn(supabase, sessionId, session.current_turn, actor.id, 'mudar_range', 0, null, narrativeText, action.rangeState)
    await advanceTurn(supabase, sessionId, session.current_turn, opponentId)
    return {
      success: true,
      turnResult: {
        damageDealt: 0,
        effectApplied: null,
        combatEnded: false,
        winnerId: null,
        narrativeText,
      },
    }
  }

  if (action.type === 'ataque_basico' || action.type === 'timeout') {
    // Ataque básico: Base 5 + Ataque × 0.8, sem custo de Éter
    const dodgeChance = calcDodgeChance(opponentAttrs.velocidade)
    const dodgeRoll = Math.random() * 100
    if (dodgeRoll <= dodgeChance) {
      narrativeText = 'Ataque básico desviado.'
      damageDealt = 0
    } else {
      const result = calcSkillDamage({
        baseDamage: 5,
        ataqueFactor: 0.8,
        attackerAtaque: actorAttrs.ataque,
        attackerMagia: actorAttrs.magia,
        targetDefesa: opponentAttrs.defesa,
      })
      damageDealt = Math.floor(result.afterDefense)
      narrativeText = action.type === 'timeout'
        ? `Turno expirado — Ataque Básico automático. ${damageDealt} de dano.`
        : `Ataque básico. ${damageDealt} de dano.`
    }
  }

  let skillFormula: Record<string, number> | null = null

  if (action.type === 'skill') {
    // Busca skill e valida
    const { data: skill } = await supabase
      .from('skills')
      .select('*')
      .eq('id', action.skillId)
      .single()
    if (!skill) return { success: false, error: 'Skill não encontrada.' }

    // Verifica se skill está na building do ator
    const { data: buildingSlot } = await supabase
      .from('character_building')
      .select('slot')
      .eq('character_id', actor.id)
      .eq('skill_id', action.skillId)
      .maybeSingle()
    if (!buildingSlot) return { success: false, error: 'Skill não está equipada.' }

    // Verifica Éter suficiente
    if (actorAttrs.eter_atual < (skill.eter_cost ?? 0)) {
      return { success: false, error: 'Éter insuficiente.' }
    }

    // Calcula dano com fórmula da skill
    const formula = (skill.formula ?? {}) as Record<string, number>
    skillFormula = formula
    const dodgeChance = calcDodgeChance(opponentAttrs.velocidade)
    const dodgeRoll = Math.random() * 100

    if (dodgeRoll <= dodgeChance && !formula.is_true_damage) {
      narrativeText = `${skill.name} desviada.`
      damageDealt = 0
    } else {
      const result = calcSkillDamage({
        baseDamage: formula.base ?? 0,
        ataqueFactor: formula.ataque_factor,
        magiaFactor: formula.magia_factor,
        defensaFactor: formula.defesa_factor,
        attackerAtaque: actorAttrs.ataque,
        attackerMagia: actorAttrs.magia,
        targetDefesa: opponentAttrs.defesa,
        defensePenetration: formula.defense_penetration_percent,
        isTrueDamage: !!formula.is_true_damage,
      })
      damageDealt = Math.floor(result.afterDefense)
      narrativeText = `${skill.name}: ${damageDealt} de dano.`

      // Aplica efeito de status se houver
      if (formula.effect_type) {
        effectApplied = String(formula.effect_type)
        narrativeText += ` Efeito: ${formula.effect_type}.`
      }
    }

    // Debita Éter do ator
    await supabase
      .from('character_attributes')
      .update({ eter_atual: actorAttrs.eter_atual - (skill.eter_cost ?? 0) })
      .eq('character_id', actor.id)
  }

  // Aplica dano ao oponente
  if (damageDealt > 0) {
    const newHp = Math.max(0, opponentAttrs.hp_atual - damageDealt)
    await supabase
      .from('character_attributes')
      .update({ hp_atual: newHp })
      .eq('character_id', opponentId)

    // Verifica derrota
    if (newHp <= 0) {
      const actionType = action.type === 'skill' ? 'skill' : (action.type === 'timeout' ? 'timeout' : 'ataque_basico')
      const skillId = action.type === 'skill' ? action.skillId : undefined
      await recordTurn(supabase, sessionId, session.current_turn, actor.id,
        actionType, damageDealt, effectApplied, narrativeText, undefined, skillId)
      return await finishCombat(supabase, sessionId, actor.id, opponentId, 'hp_zero', session.modality)
    }
  }

  // Aplica efeito de status
  if (effectApplied && action.type === 'skill' && skillFormula) {
    await supabase.from('combat_effects').insert({
      session_id: sessionId,
      character_id: opponentId,
      effect_type: effectApplied,
      stacks: 1,
      duration_turns: skillFormula.effect_duration ?? 2,
      applied_at_turn: session.current_turn,
      expires_at_turn: session.current_turn + (skillFormula.effect_duration ?? 2),
      source_skill_id: action.skillId,
    })
  }

  const actionType = action.type === 'timeout' ? 'timeout' : action.type
  const skillId = action.type === 'skill' ? action.skillId : undefined
  await recordTurn(supabase, sessionId, session.current_turn, actor.id,
    actionType, damageDealt, effectApplied, narrativeText, undefined, skillId)

  await advanceTurn(supabase, sessionId, session.current_turn, opponentId)

  return {
    success: true,
    turnResult: {
      damageDealt,
      effectApplied,
      combatEnded: false,
      winnerId: null,
      narrativeText,
    },
  }
}

/**
 * Verifica e processa timeout de turno.
 * Chamado pelo cliente quando o timer expira.
 */
export async function processTurnTimeout(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('combat_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('status', 'active')
    .single()
  if (!session) return { success: false, error: 'Sessão não encontrada.' }

  // Verifica que o turno realmente expirou
  const turnExpiresAt = new Date(session.turn_expires_at ?? 0)
  if (turnExpiresAt > new Date()) {
    return { success: false, error: 'Turno ainda não expirou.' }
  }

  // Executa Ataque Básico automático pelo jogador ativo
  return await processTurn(sessionId, { type: 'timeout' }, userId)
}

/**
 * Finaliza o combate, aplica consequências e gera evento.
 */
async function finishCombat(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  winnerId: string,
  loserId: string,
  reason: string,
  modality: string
): Promise<{
  success: boolean
  error?: string
  turnResult?: {
    damageDealt: number
    effectApplied: string | null
    combatEnded: boolean
    winnerId: string | null
    narrativeText: string
  }
}> {
  await supabase
    .from('combat_sessions')
    .update({
      status: 'finished',
      winner_id: winnerId,
      finished_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  // Restaura HP e Éter de ambos ao fim do combate
  await Promise.all([
    supabase.rpc('restore_combat_vitals', { p_character_id: winnerId }),
    supabase.rpc('restore_combat_vitals', { p_character_id: loserId }),
  ])

  // Aplica consequências de derrota
  const essenciaLoss = DEFEAT_ESSENCIA_LOSS[modality] ?? 0
  const recoveryHours = DEFEAT_RECOVERY_HOURS[modality] ?? 0

  if (essenciaLoss > 0) {
    const { data: wallet } = await supabase
      .from('character_wallet')
      .select('essencia')
      .eq('character_id', loserId)
      .single()
    if (wallet) {
      await supabase
        .from('character_wallet')
        .update({ essencia: wallet.essencia - essenciaLoss })
        .eq('character_id', loserId)
    }
  }

  if (recoveryHours > 0) {
    const recoveryUntil = new Date()
    recoveryUntil.setHours(recoveryUntil.getHours() + recoveryHours)
    await supabase
      .from('characters')
      .update({ recovery_until: recoveryUntil.toISOString() })
      .eq('id', loserId)
  }

  const [{ data: winner }, { data: loser }] = await Promise.all([
    supabase.from('characters').select('name').eq('id', winnerId).single(),
    supabase.from('characters').select('name').eq('id', loserId).single(),
  ])

  const narrativeText = reason === 'render'
    ? `${loser?.name ?? 'Desafiante'} se rendeu. ${winner?.name ?? 'Vencedor'} vence.`
    : `${winner?.name ?? 'Vencedor'} derrota ${loser?.name ?? 'Derrotado'}.`

  await createEvent(supabase, {
    type: 'combat_finished',
    actorId: winnerId,
    targetId: loserId,
    metadata: {
      session_id: sessionId,
      modality,
      reason,
      essencia_loss: essenciaLoss,
      recovery_hours: recoveryHours,
    },
    isPublic: true,
    narrativeText,
  })

  return {
    success: true,
    turnResult: {
      damageDealt: 0,
      effectApplied: null,
      combatEnded: true,
      winnerId,
      narrativeText,
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

async function recordTurn(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  turnNumber: number,
  actorId: string,
  actionType: string,
  damageDealt: number,
  effectApplied: string | null,
  narrativeText: string,
  rangeState?: string,
  skillId?: string
) {
  await supabase.from('combat_turns').insert({
    session_id: sessionId,
    turn_number: turnNumber,
    actor_id: actorId,
    action_type: actionType,
    skill_id: skillId ?? null,
    range_state: rangeState ?? null,
    damage_dealt: damageDealt,
    effect_applied: effectApplied,
    narrative_text: narrativeText,
  })
}

async function advanceTurn(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  currentTurn: number,
  nextPlayerId: string
) {
  const turnExpiresAt = new Date()
  turnExpiresAt.setSeconds(turnExpiresAt.getSeconds() + TURN_TIMER_SECONDS)

  await supabase
    .from('combat_sessions')
    .update({
      current_turn: currentTurn + 1,
      active_player_id: nextPlayerId,
      turn_expires_at: turnExpiresAt.toISOString(),
    })
    .eq('id', sessionId)
}

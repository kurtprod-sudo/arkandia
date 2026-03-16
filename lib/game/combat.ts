// ---------------------------------------------------------------------------
// Sistema de Combate PvP — Fase 9
// Referência: GDD_Sistemas §1
// ---------------------------------------------------------------------------

import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'
import { calcSkillDamage, calcDodgeChance } from './attributes'
import { createNotification } from './notifications'
import { grantXp } from './levelup'

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

  // Busca classe do challenger para Range State inicial
  const { data: challengerClassData } = await supabase
    .from('characters')
    .select('classes(name)')
    .eq('id', challengerId)
    .single()

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

  await createNotification({
    characterId: defenderId,
    type: 'duel_received',
    title: 'Desafio recebido',
    body: `${challenger.name} desafiou você para um ${modality.replace('_', ' ')}.`,
    actionUrl: '/combat',
    metadata: { session_id: session.id },
  })

  // Registra Range State inicial baseado na classe
  const MELEE_CLASSES = ['Lutador', 'Espadachim', 'Destruidor', 'Escudeiro', 'Druida']
  const RANGED_CLASSES = ['Arqueiro', 'Atirador']
  const challengerClassName = ((challengerClassData?.classes as Record<string, unknown>)?.name as string) ?? ''
  const initialRange: 'curto' | 'medio' | 'longo' =
    MELEE_CLASSES.includes(challengerClassName) ? 'curto' :
    RANGED_CLASSES.includes(challengerClassName) ? 'longo' :
    'medio'

  await supabase.from('combat_turns').insert({
    session_id: session.id,
    turn_number: 0,
    actor_id: challengerId,
    action_type: 'mudar_range',
    range_state: initialRange,
    damage_dealt: 0,
    narrative_text: `Range inicial: ${initialRange}.`,
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

  // Garante active_player_id ao ativar
  await supabase
    .from('combat_sessions')
    .update({
      status: 'active',
      turn_expires_at: turnExpiresAt.toISOString(),
      active_player_id: session.active_player_id ?? session.challenger_id,
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

  // Busca efeitos ativos de ambos
  const { data: actorEffects } = await supabase
    .from('combat_effects')
    .select('*')
    .eq('session_id', sessionId)
    .eq('character_id', actor.id)
    .gte('expires_at_turn', session.current_turn)

  const { data: opponentEffects } = await supabase
    .from('combat_effects')
    .select('*')
    .eq('session_id', sessionId)
    .eq('character_id', opponentId)
    .gte('expires_at_turn', session.current_turn)

  // Verifica efeitos que impedem ação
  for (const effect of actorEffects ?? []) {
    switch (effect.effect_type) {
      case 'stun':
      case 'sono':
        await recordTurn(supabase, sessionId, session.current_turn,
          actor.id, 'ataque_basico', 0, effect.effect_type,
          `${actor.name} está imobilizado por ${effect.effect_type}.`)
        await advanceTurn(supabase, sessionId, session.current_turn, opponentId, actor.id)
        return {
          success: true,
          turnResult: {
            damageDealt: 0,
            effectApplied: effect.effect_type,
            combatEnded: false,
            winnerId: null,
            narrativeText: `${actor.name} está imobilizado por ${effect.effect_type}.`,
          },
        }

      case 'silencio':
        if (action.type === 'skill') {
          return { success: false, error: 'Silenciado — não pode usar Skills.' }
        }
        break

      case 'raiz':
        if (action.type === 'mudar_range') {
          return { success: false, error: 'Enraizado — não pode mudar Range State.' }
        }
        break

      case 'provocacao':
        if (action.type !== 'ataque_basico' && action.type !== 'timeout') {
          return { success: false, error: 'Provocado — obrigado a usar Ataque Básico.' }
        }
        break
    }
  }

  // Processa DoTs do ator (dano que ele sofre antes de agir)
  let dotDamageToActor = 0
  for (const effect of actorEffects ?? []) {
    switch (effect.effect_type) {
      case 'veneno':
        dotDamageToActor += (effect.stacks ?? 1) * 3
        break
      case 'queimadura':
        dotDamageToActor += Math.floor(actorAttrs.hp_max * 0.04)
        break
      case 'sangramento':
        dotDamageToActor += 5
        break
      case 'corrosao_eterica': {
        const newEter = Math.max(0, actorAttrs.eter_atual - 5)
        await supabase
          .from('character_attributes')
          .update({ eter_atual: newEter })
          .eq('character_id', actor.id)
        actorAttrs.eter_atual = newEter
        break
      }
    }
  }

  if (dotDamageToActor > 0) {
    const newActorHp = Math.max(0, actorAttrs.hp_atual - dotDamageToActor)
    await supabase
      .from('character_attributes')
      .update({ hp_atual: newActorHp })
      .eq('character_id', actor.id)
    actorAttrs.hp_atual = newActorHp

    if (newActorHp === 0) {
      await recordTurn(supabase, sessionId, session.current_turn,
        actor.id, 'ataque_basico', 0, null,
        `${actor.name} sucumbiu aos efeitos de status.`)
      return await finishCombat(
        supabase, sessionId, opponentId, actor.id, 'hp_zero', session.modality
      )
    }
  }

  // Processa buffs do ator (HoT e recarga de Éter)
  for (const effect of actorEffects ?? []) {
    if (effect.effect_type === 'regeneracao') {
      const newHp = Math.min(actorAttrs.hp_max, actorAttrs.hp_atual + 8)
      await supabase
        .from('character_attributes')
        .update({ hp_atual: newHp })
        .eq('character_id', actor.id)
      actorAttrs.hp_atual = newHp
    }
    if (effect.effect_type === 'recarga') {
      const newEter = Math.min(actorAttrs.eter_max, actorAttrs.eter_atual + 5)
      await supabase
        .from('character_attributes')
        .update({ eter_atual: newEter })
        .eq('character_id', actor.id)
      actorAttrs.eter_atual = newEter
    }
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
      await advanceTurn(supabase, sessionId, session.current_turn, opponentId, actor.id)
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
    await advanceTurn(supabase, sessionId, session.current_turn, opponentId, actor.id)
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
    // Ataque básico: Base 8 + Ataque × 0.6, sem custo de Éter
    const dodgeChance = calcDodgeChance(opponentAttrs.velocidade)
    const dodgeRoll = Math.random() * 100
    if (dodgeRoll <= dodgeChance) {
      narrativeText = 'Ataque básico desviado.'
      damageDealt = 0
    } else {
      const result = calcSkillDamage({
        baseDamage: 8,
        ataqueFactor: 0.6,
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

    // Calcula dano com fórmula da skill — verifica Range State
    const currentRangeState = await getCurrentRangeState(supabase, sessionId)
    const skillRange = skill.range_state as string

    if (skillRange && skillRange !== 'all' && skillRange !== currentRangeState) {
      skillFormula = { ...(skill.formula as Record<string, number> ?? {}), _range_penalty: 0.5 }
    } else {
      skillFormula = (skill.formula ?? {}) as Record<string, number>
    }

    const dodgeChance = calcDodgeChance(opponentAttrs.velocidade)
    const dodgeRoll = Math.random() * 100

    if (dodgeRoll <= dodgeChance && !skillFormula.is_true_damage) {
      narrativeText = `${skill.name} desviada.`
      damageDealt = 0
    } else {
      const result = calcSkillDamage({
        baseDamage: skillFormula.base ?? 0,
        ataqueFactor: skillFormula.ataque_factor,
        magiaFactor: skillFormula.magia_factor,
        defensaFactor: skillFormula.defesa_factor,
        attackerAtaque: actorAttrs.ataque,
        attackerMagia: actorAttrs.magia,
        targetDefesa: opponentAttrs.defesa,
        defensePenetration: skillFormula.defense_penetration_percent,
        isTrueDamage: !!skillFormula.is_true_damage,
      })

      if (skillFormula._range_penalty) {
        damageDealt = Math.floor(result.afterDefense * skillFormula._range_penalty)
        narrativeText = `${skill.name}: ${damageDealt} de dano (fora do range ideal).`
      } else {
        damageDealt = Math.floor(result.afterDefense)
        narrativeText = `${skill.name}: ${damageDealt} de dano.`
      }

      // Aplica efeito de status se houver
      if (skillFormula.effect_type) {
        effectApplied = String(skillFormula.effect_type)
        narrativeText += ` Efeito: ${skillFormula.effect_type}.`
      }
    }

    // Debita Éter do ator
    await supabase
      .from('character_attributes')
      .update({ eter_atual: actorAttrs.eter_atual - (skill.eter_cost ?? 0) })
      .eq('character_id', actor.id)
  }

  // Verifica escudo etéreo do oponente
  const shieldEffect = (opponentEffects ?? []).find(
    (e) => e.effect_type === 'escudo_etereo'
  )
  if (shieldEffect && damageDealt > 0) {
    const shieldValue = (shieldEffect.stacks ?? 1) * 20
    if (shieldValue >= damageDealt) {
      await supabase
        .from('combat_effects')
        .update({ stacks: Math.max(0, (shieldEffect.stacks ?? 1) - 1) })
        .eq('id', shieldEffect.id)
      damageDealt = 0
      narrativeText += ' Escudo etéreo absorveu o dano.'
    } else {
      damageDealt -= shieldValue
      await supabase
        .from('combat_effects')
        .delete()
        .eq('id', shieldEffect.id)
      narrativeText += ` Escudo etéreo absorveu ${shieldValue} de dano.`
    }
  }

  // Resistência racial a elementos (ex: Draconiano -15% dano de fogo)
  if (damageDealt > 0 && action.type === 'skill' && skillFormula) {
    const skillElement = ((skillFormula as unknown as Record<string, unknown>).element as string) ?? null
    const skillTags = ((skillFormula as unknown as Record<string, unknown>).tags as string[]) ?? []
    const hasFire = skillElement === 'fogo' || skillTags.includes('fogo')

    if (hasFire) {
      const { data: opponentChar } = await supabase
        .from('characters')
        .select('races(passives)')
        .eq('id', opponentId)
        .single()
      const opPassives = (
        (opponentChar?.races as Record<string, unknown> | null)?.passives as Record<string, unknown>
      ) ?? {}
      const fireRes = (opPassives.fire_damage_resistance_percent as number) ?? 0
      if (fireRes > 0) {
        const reduction = Math.floor(damageDealt * (fireRes / 100))
        damageDealt = Math.max(1, damageDealt - reduction)
        narrativeText += ` (resistência racial: -${reduction})`
      }
    }
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

  await advanceTurn(supabase, sessionId, session.current_turn, opponentId, actor.id)

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

  // XP por combate PvP — Referência: GDD_Balanceamento §6
  const XP_PVP: Record<string, { winner: number; loser: number }> = {
    duelo_livre:     { winner: 0,   loser: 0  },
    duelo_ranqueado: { winner: 200, loser: 60 },
    emboscada:       { winner: 150, loser: 40 },
    torneio:         { winner: 200, loser: 60 },
  }
  const xpRewards = XP_PVP[modality] ?? { winner: 0, loser: 0 }
  if (xpRewards.winner > 0) {
    await grantXp(winnerId, xpRewards.winner, supabase)
  }
  if (xpRewards.loser > 0) {
    await grantXp(loserId, xpRewards.loser, supabase)
  }

  // Recompensas de Libras e Essências por PvP — Referência: GDD_Balanceamento §10, §11
  const PVP_REWARDS: Record<string, { winner: { libras: number; essencia: number }; loser: { essencia: number } }> = {
    duelo_livre:     { winner: { libras: 0,  essencia: 0  }, loser: { essencia: 0  } },
    duelo_ranqueado: { winner: { libras: 80, essencia: 20 }, loser: { essencia: 5  } },
    emboscada:       { winner: { libras: 60, essencia: 15 }, loser: { essencia: 0  } },
    torneio:         { winner: { libras: 0,  essencia: 10 }, loser: { essencia: 0  } },
  }
  const pvpRewards = PVP_REWARDS[modality] ?? PVP_REWARDS.duelo_livre
  if (pvpRewards.winner.libras > 0 || pvpRewards.winner.essencia > 0) {
    const { data: ww } = await supabase
      .from('character_wallet').select('libras, essencia').eq('character_id', winnerId).single()
    if (ww) {
      await supabase.from('character_wallet').update({
        libras: ww.libras + pvpRewards.winner.libras,
        essencia: ww.essencia + pvpRewards.winner.essencia,
      }).eq('character_id', winnerId)
    }
  }
  if (pvpRewards.loser.essencia > 0) {
    const { data: lw } = await supabase
      .from('character_wallet').select('essencia').eq('character_id', loserId).single()
    if (lw) {
      await supabase.from('character_wallet').update({
        essencia: lw.essencia + pvpRewards.loser.essencia,
      }).eq('character_id', loserId)
    }
  }

  // Completa daily task de PvP para o vencedor
  const { completeTask } = await import('./daily')
  await completeTask(winnerId, 'win_pvp').catch(() => {})

  // Se a sessão tem desafio diário vinculado, resolve
  // resolveDailyChallenge determina won baseado em challenge.character_id == winnerId
  const { resolveDailyChallenge } = await import('./daily_challenge')
  await resolveDailyChallenge(sessionId, winnerId).catch(() => {})

  const { checkAchievements } = await import('./achievements')
  if (modality === 'duelo_ranqueado' || modality === 'duelo_livre') {
    await checkAchievements(winnerId, 'pvp_win', { modality }, supabase).catch(() => {})
  }
  if (modality === 'emboscada') {
    await checkAchievements(winnerId, 'ambush_performed', {}, supabase).catch(() => {})
    await checkAchievements(winnerId, 'pvp_win', { modality }, supabase).catch(() => {})
  }

  // Se a sessão é de torneio, propaga resultado para o bracket
  if (modality === 'torneio') {
    const { resolveTournamentMatch } = await import('./tournament')
    await resolveTournamentMatch(sessionId, winnerId)
  }

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
  nextPlayerId: string,
  actorId?: string
) {
  // Regeneração racial de Éter por turno (ex: Melfork +3/turno)
  if (actorId) {
    const { data: actorChar } = await supabase
      .from('characters')
      .select('races(passives)')
      .eq('id', actorId)
      .single()

    const actorPassives = (
      (actorChar?.races as Record<string, unknown> | null)?.passives as Record<string, unknown>
    ) ?? {}
    const eterRegenPerTurn = (actorPassives.eter_regen_per_turn as number) ?? 0

    if (eterRegenPerTurn > 0) {
      const { data: actorAttrs } = await supabase
        .from('character_attributes')
        .select('eter_atual, eter_max')
        .eq('character_id', actorId)
        .single()

      if (actorAttrs) {
        const newEter = Math.min(actorAttrs.eter_max, actorAttrs.eter_atual + eterRegenPerTurn)
        if (newEter !== actorAttrs.eter_atual) {
          await supabase
            .from('character_attributes')
            .update({ eter_atual: newEter })
            .eq('character_id', actorId)
        }
      }
    }
  }

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

/**
 * Retorna o Range State atual da sessão
 * baseado no último turno de mudança de range.
 * Default: 'medio' se nunca mudou.
 */
async function getCurrentRangeState(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<'curto' | 'medio' | 'longo'> {
  const { data } = await supabase
    .from('combat_turns')
    .select('range_state')
    .eq('session_id', sessionId)
    .eq('action_type', 'mudar_range')
    .not('range_state', 'is', null)
    .order('turn_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.range_state as 'curto' | 'medio' | 'longo') ?? 'medio'
}

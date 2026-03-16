// ---------------------------------------------------------------------------
// Lógica de Expedições Idle
// Referência: GDD_Sistemas §3
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'
import { createNotification } from './notifications'
import { grantXp } from './levelup'
import { modifyReputation, hasMinimumReputation } from './reputation'

// Horas de recuperação por nível de risco em caso de falha
const INJURY_HOURS: Record<string, number> = {
  seguro:   0,
  moderado: 4,
  perigoso: 12,
  extremo:  24,
}

// Essências perdidas em falha por nível de risco
const FAILURE_ESSENCIA_LOSS: Record<string, number> = {
  seguro:   0,
  moderado: 0,
  perigoso: 5,
  extremo:  15,
}

/**
 * Calcula a chance de sucesso de uma expedição.
 * Base_chance + modificadores dos atributos do personagem.
 * Referência: GDD_Sistemas §3.2
 */
export function calculateSuccessChance(
  attrs: Record<string, number>,
  successFormula: Record<string, number>
): number {
  const base = successFormula.base_chance ?? 50
  let bonus = 0

  const weights: Record<string, string> = {
    ataque_weight:     'ataque',
    magia_weight:      'magia',
    velocidade_weight: 'velocidade',
    precisao_weight:   'precisao',
    vitalidade_weight: 'vitalidade',
    defesa_weight:     'defesa',
  }

  for (const [weightKey, attrKey] of Object.entries(weights)) {
    if (successFormula[weightKey] && attrs[attrKey]) {
      bonus += attrs[attrKey] * successFormula[weightKey]
    }
  }

  return Math.min(95, Math.max(5, base + bonus))
}

/**
 * Inicia uma expedição para um personagem.
 * Valida: personagem não está em expedição ativa, não está ferido.
 */
export async function startExpedition(
  characterId: string,
  userId: string,
  expeditionTypeId: string
): Promise<{ success: boolean; error?: string; expeditionId?: string }> {
  const supabase = await createClient()

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id, injured_until')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Verifica se está ferido
  if (character.injured_until) {
    const injuredUntil = new Date(character.injured_until)
    if (injuredUntil > new Date()) {
      return {
        success: false,
        error: `Personagem ferido até ${injuredUntil.toLocaleString('pt-BR')}.`,
      }
    }
  }

  // Verifica se já está em expedição ativa
  const { data: activeExpedition } = await supabase
    .from('expeditions')
    .select('id, ends_at')
    .eq('character_id', characterId)
    .eq('status', 'active')
    .maybeSingle()

  if (activeExpedition) {
    return {
      success: false,
      error: 'Personagem já está em uma expedição.',
    }
  }

  // Busca tipo de expedição
  const { data: expType } = await supabase
    .from('expedition_types')
    .select('*')
    .eq('id', expeditionTypeId)
    .eq('is_active', true)
    .single()
  if (!expType) return { success: false, error: 'Tipo de expedição não encontrado.' }

  // Valida reputação mínima para expedições de facção
  if (expType.required_faction_slug) {
    const minStage = expType.risk_level === 'perigoso' || expType.risk_level === 'extremo'
      ? 'aliado' as const
      : 'reconhecido' as const
    const hasRep = await hasMinimumReputation(characterId, expType.required_faction_slug, minStage)
    if (!hasRep) {
      const labels = { reconhecido: 'Reconhecido', aliado: 'Aliado' }
      return {
        success: false,
        error: `Reputação insuficiente. Necessário: ${labels[minStage]} com a facção.`,
      }
    }
  }

  // Calcula ends_at
  const endsAt = new Date()
  endsAt.setHours(endsAt.getHours() + expType.duration_hours)

  // Cria a expedição
  const { data: expedition, error } = await supabase
    .from('expeditions')
    .insert({
      character_id: characterId,
      type_id: expeditionTypeId,
      status: 'active',
      risk_level: expType.risk_level,
      ends_at: endsAt.toISOString(),
    })
    .select()
    .single()

  if (error || !expedition) {
    return { success: false, error: 'Erro ao iniciar expedição.' }
  }

  await createEvent(supabase, {
    type: 'expedition_started',
    actorId: characterId,
    metadata: {
      expedition_id: expedition.id,
      expedition_name: expType.name,
      risk_level: expType.risk_level,
      duration_hours: expType.duration_hours,
    },
    isPublic: false,
    narrativeText: `Expedição iniciada: ${expType.name}.`,
  })

  return { success: true, expeditionId: expedition.id }
}

/**
 * Resolve uma expedição concluída.
 * Calcula resultado, aplica recompensas ou consequências.
 * Chamado quando o jogador coleta (ends_at já passou).
 */
export async function resolveExpedition(
  expeditionId: string,
  userId: string
): Promise<{
  success: boolean
  error?: string
  result?: {
    success: boolean
    xp: number
    libras: number
    lore: boolean
    materialDrop: boolean
    rareDrop: boolean
    injured: boolean
    narrativeText: string
  }
}> {
  const supabase = await createClient()

  // Busca expedição
  const { data: expedition } = await supabase
    .from('expeditions')
    .select('*, expedition_types(*)')
    .eq('id', expeditionId)
    .eq('status', 'active')
    .single()

  if (!expedition) return { success: false, error: 'Expedição não encontrada.' }

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', expedition.character_id)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  // Verifica se expedição terminou
  const endsAt = new Date(expedition.ends_at)
  if (endsAt > new Date()) {
    return { success: false, error: 'Expedição ainda em andamento.' }
  }

  const expType = expedition.expedition_types as Record<string, unknown>
  const riskLevel = expedition.risk_level as string
  const lootTable = expType.loot_table as Record<string, unknown>
  const successFormula = expType.success_formula as Record<string, number>

  // Busca atributos do personagem
  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('ataque, magia, defesa, vitalidade, velocidade, precisao, tenacidade')
    .eq('character_id', expedition.character_id)
    .single()

  const attrsMap = attrs ? (attrs as Record<string, number>) : {}
  const successChance = calculateSuccessChance(attrsMap, successFormula)
  const roll = Math.random() * 100
  const expeditionSuccess = roll <= successChance

  // Calcula recompensas
  let xpGained = 0
  let librasGained = 0
  let loreDrop = false
  let materialDrop = false
  let rareDrop = false
  let injured = false
  let narrativeText = ''

  if (expeditionSuccess) {
    const xpBase = lootTable.xp as number ?? 50
    xpGained = Math.floor(xpBase * (0.8 + Math.random() * 0.4))

    const librasConfig = lootTable.libras as { min: number; max: number } | undefined
    if (librasConfig) {
      librasGained = Math.floor(
        librasConfig.min + Math.random() * (librasConfig.max - librasConfig.min)
      )
    }

    loreDrop = Math.random() < ((lootTable.lore_chance as number) ?? 0)
    materialDrop = Math.random() < ((lootTable.material_chance as number) ?? 0)
    rareDrop = Math.random() < ((lootTable.rare_chance as number) ?? 0)

    narrativeText = `Missão cumprida. +${xpGained} XP, +${librasGained} Libras.`
    if (loreDrop) narrativeText += ' Um fragmento de lore foi descoberto.'
    if (rareDrop) narrativeText += ' Item raro obtido.'
  } else {
    // Falha — aplica consequências por nível de risco
    const injuryHours = INJURY_HOURS[riskLevel] ?? 0
    const essenciaLoss = FAILURE_ESSENCIA_LOSS[riskLevel] ?? 0

    if (injuryHours > 0) {
      injured = true
      const injuredUntil = new Date()
      injuredUntil.setHours(injuredUntil.getHours() + injuryHours)
      await supabase
        .from('characters')
        .update({
          injured_until: injuredUntil.toISOString(),
          status: 'injured',
        })
        .eq('id', expedition.character_id)
    }

    if (essenciaLoss > 0) {
      const { data: wallet } = await supabase
        .from('character_wallet')
        .select('essencia')
        .eq('character_id', expedition.character_id)
        .single()
      if (wallet) {
        await supabase
          .from('character_wallet')
          .update({ essencia: wallet.essencia - essenciaLoss })
          .eq('character_id', expedition.character_id)
      }
    }

    narrativeText = 'A expedição falhou.'
    if (injured) narrativeText += ` Personagem ferido por ${INJURY_HOURS[riskLevel]}h.`
    if (essenciaLoss > 0) narrativeText += ` -${essenciaLoss} Essências.`
  }

  // Aplica XP (com level up automático)
  if (xpGained > 0) {
    await grantXp(expedition.character_id, xpGained, supabase)
  }

  if (librasGained > 0) {
    const { data: wallet } = await supabase
      .from('character_wallet')
      .select('libras')
      .eq('character_id', expedition.character_id)
      .single()
    if (wallet) {
      await supabase
        .from('character_wallet')
        .update({ libras: wallet.libras + librasGained })
        .eq('character_id', expedition.character_id)
    }
  }

  // Resolve a expedição
  const resultData = {
    success: expeditionSuccess,
    xp: xpGained,
    libras: librasGained,
    lore: loreDrop,
    material: materialDrop,
    rare: rareDrop,
    injured,
    roll: Math.round(roll),
    success_chance: Math.round(successChance),
  }

  await supabase
    .from('expeditions')
    .update({
      status: expeditionSuccess ? 'completed' : 'failed',
      result: resultData,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', expeditionId)

  await createEvent(supabase, {
    type: expeditionSuccess ? 'expedition_completed' : 'expedition_failed',
    actorId: expedition.character_id,
    metadata: resultData,
    isPublic: expeditionSuccess,
    narrativeText,
  })

  await createNotification({
    characterId: expedition.character_id,
    type: 'expedition_done',
    title: expeditionSuccess ? 'Expedição concluída' : 'Expedição falhou',
    body: narrativeText,
    actionUrl: '/expeditions',
  })

  // Concede/remove reputação para expedições de facção
  if (expType.required_faction_slug) {
    if (expeditionSuccess) {
      await modifyReputation(
        expedition.character_id,
        expType.required_faction_slug as string,
        15,
        `Expedição completada: ${expType.name as string}`,
        'expedition'
      )
    } else {
      await modifyReputation(
        expedition.character_id,
        expType.required_faction_slug as string,
        -5,
        `Expedição falhou: ${expType.name as string}`,
        'expedition'
      )
    }
  }

  return {
    success: true,
    result: {
      success: expeditionSuccess,
      xp: xpGained,
      libras: librasGained,
      lore: loreDrop,
      materialDrop,
      rareDrop,
      injured,
      narrativeText,
    },
  }
}

/**
 * Retorna a expedição ativa do personagem, se houver.
 */
export async function getActiveExpedition(characterId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('expeditions')
    .select('*, expedition_types(name, subtype, risk_level, duration_hours)')
    .eq('character_id', characterId)
    .eq('status', 'active')
    .maybeSingle()
  return data
}

/**
 * Retorna o histórico de expedições do personagem.
 */
export async function getExpeditionHistory(characterId: string, limit = 10) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('expeditions')
    .select('*, expedition_types(name, subtype, risk_level)')
    .eq('character_id', characterId)
    .neq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

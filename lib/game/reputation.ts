// ---------------------------------------------------------------------------
// Lógica de Reputação e Facções
// Referência: GDD_Mundo §8, GDD_Personagem §12
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'
import { createNotification } from './notifications'
import type { ReputationStage } from '@/types'

// Thresholds de pontos por estágio
const STAGE_THRESHOLDS = {
  hostil:      { min: -Infinity, max: -1 },
  neutro:      { min: 0,         max: 99  },
  reconhecido: { min: 100,       max: 299 },
  aliado:      { min: 300,       max: 699 },
  venerado:    { min: 700,       max: Infinity },
} as const

export function getReputationStage(points: number): ReputationStage {
  if (points < 0)   return 'hostil'
  if (points < 100) return 'neutro'
  if (points < 300) return 'reconhecido'
  if (points < 700) return 'aliado'
  return 'venerado'
}

/**
 * Atualiza a reputação de um personagem com uma facção.
 * Aplica conflito automático: facções opostas recebem delta inverso
 * proporcional (metade do delta negativo).
 * Referência: GDD_Mundo §8
 */
export async function updateReputation(
  characterId: string,
  factionSlug: string,
  delta: number
): Promise<{ success: boolean; error?: string; newStage?: ReputationStage }> {
  const supabase = await createClient()

  // Busca a facção
  const { data: faction } = await supabase
    .from('factions')
    .select('id, name, slug, conflict_faction_slugs')
    .eq('slug', factionSlug)
    .single()
  if (!faction) return { success: false, error: 'Facção não encontrada.' }

  // Upsert da reputação
  const { data: current } = await supabase
    .from('character_reputation')
    .select('id, points')
    .eq('character_id', characterId)
    .eq('faction_id', faction.id)
    .maybeSingle()

  const currentPoints = current?.points ?? 0
  const newPoints = currentPoints + delta
  const newStage = getReputationStage(newPoints)

  if (current) {
    await supabase
      .from('character_reputation')
      .update({ points: newPoints, stage: newStage })
      .eq('character_id', characterId)
      .eq('faction_id', faction.id)
  } else {
    await supabase
      .from('character_reputation')
      .insert({
        character_id: characterId,
        faction_id: faction.id,
        points: newPoints,
        stage: newStage,
      })
  }

  // Aplica conflito automático nas facções opostas
  const conflictSlugs = faction.conflict_faction_slugs as string[] ?? []
  if (conflictSlugs.length > 0 && delta !== 0) {
    const conflictDelta = Math.floor(-Math.abs(delta) / 2)
    for (const conflictSlug of conflictSlugs) {
      if (conflictDelta !== 0) {
        await updateReputation(characterId, conflictSlug, conflictDelta)
      }
    }
  }

  // Registra no log de auditoria
  await supabase.from('reputation_events').insert({
    character_id: characterId,
    faction_id: faction.id,
    delta,
    reason: `reputation_update`,
    source: 'quest',
  }).catch(() => {}) // silently fail if table doesn't exist yet

  // Registra evento e notifica se houve mudança de estágio
  const oldStage = getReputationStage(currentPoints)
  if (oldStage !== newStage) {
    const STAGE_LABELS: Record<ReputationStage, string> = {
      hostil: 'Hostil', neutro: 'Neutro', reconhecido: 'Reconhecido',
      aliado: 'Aliado', venerado: 'Venerado',
    }

    await createEvent(supabase, {
      type: 'reputation_changed',
      actorId: characterId,
      metadata: {
        faction: faction.name,
        faction_slug: factionSlug,
        old_stage: oldStage,
        new_stage: newStage,
        delta,
      },
      isPublic: false,
      narrativeText: delta > 0
        ? `Reputação com ${faction.name} avançou para ${newStage}.`
        : `Reputação com ${faction.name} caiu para ${newStage}.`,
    })

    await createNotification({
      characterId,
      type: 'general',
      title: `Reputação: ${faction.name}`,
      body: `Seu estágio mudou para ${STAGE_LABELS[newStage]}.`,
      actionUrl: '/character?tab=reputation',
    })
  }

  return { success: true, newStage }
}

/**
 * Retorna todas as reputações de um personagem.
 * Exclui facções hidden (is_hidden = true) para exibição pública.
 */
export async function getCharacterReputations(
  characterId: string,
  includeHidden = false
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('character_reputation')
    .select('*, factions(id, name, slug, type, is_hidden)')
    .eq('character_id', characterId)
  if (error) throw error

  const reputations = data ?? []
  if (includeHidden) return reputations
  return reputations.filter((r) => {
    const f = r.factions as Record<string, unknown> | null
    return f ? !f.is_hidden : true
  })
}

/**
 * Verifica se uma facção está bloqueada por conflito de reputação.
 * Ex: reputação alta com Conselho bloqueia missões da Maré Vermelha.
 */
export async function isFactionBlocked(
  characterId: string,
  factionSlug: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data: faction } = await supabase
    .from('factions')
    .select('conflict_faction_slugs')
    .eq('slug', factionSlug)
    .single()
  if (!faction) return false

  const conflictSlugs = faction.conflict_faction_slugs as string[] ?? []
  if (conflictSlugs.length === 0) return false

  // Verifica se alguma facção conflitante tem reputação alta (aliado ou venerado)
  for (const conflictSlug of conflictSlugs) {
    const { data: conflictFaction } = await supabase
      .from('factions')
      .select('id')
      .eq('slug', conflictSlug)
      .single()
    if (!conflictFaction) continue

    const { data: rep } = await supabase
      .from('character_reputation')
      .select('stage')
      .eq('character_id', characterId)
      .eq('faction_id', conflictFaction.id)
      .maybeSingle()

    if (rep?.stage === 'aliado' || rep?.stage === 'venerado') {
      return true
    }
  }

  return false
}

/**
 * Inicializa reputação neutra com todas as facções públicas
 * para um personagem recém-criado.
 */
export async function initializeReputation(characterId: string): Promise<void> {
  const supabase = await createClient()

  const { data: factions } = await supabase
    .from('factions')
    .select('id')
    .eq('is_hidden', false)

  if (!factions || factions.length === 0) return

  const rows = factions.map((f) => ({
    character_id: characterId,
    faction_id: f.id,
    points: 0,
    stage: 'neutro' as ReputationStage,
  }))

  await supabase
    .from('character_reputation')
    .upsert(rows, { onConflict: 'character_id,faction_id', ignoreDuplicates: true })
}

/**
 * Verifica se um personagem tem reputação mínima com uma facção.
 * Usado para validar acesso a expedições de facção.
 */
export async function hasMinimumReputation(
  characterId: string,
  factionSlug: string,
  minimumStage: ReputationStage
): Promise<boolean> {
  const STAGE_ORDER: Record<ReputationStage, number> = {
    hostil: 0, neutro: 1, reconhecido: 2, aliado: 3, venerado: 4,
  }

  const supabase = await createClient()

  const { data: faction } = await supabase
    .from('factions')
    .select('id')
    .eq('slug', factionSlug)
    .single()
  if (!faction) return false

  const { data: rep } = await supabase
    .from('character_reputation')
    .select('stage')
    .eq('character_id', characterId)
    .eq('faction_id', faction.id)
    .maybeSingle()

  const currentStage = (rep?.stage as ReputationStage) ?? 'neutro'
  return STAGE_ORDER[currentStage] >= STAGE_ORDER[minimumStage]
}

/**
 * Modifica reputação com registro de fonte e motivo.
 * Wrapper sobre updateReputation que registra em reputation_events.
 */
export async function modifyReputation(
  characterId: string,
  factionSlug: string,
  delta: number,
  reason: string,
  source: 'expedition' | 'war' | 'narrative' | 'gm' | 'quest'
): Promise<{ success: boolean; error?: string; newStage?: ReputationStage }> {
  const supabase = await createClient()

  // Busca facção para log
  const { data: faction } = await supabase
    .from('factions')
    .select('id')
    .eq('slug', factionSlug)
    .single()

  if (faction) {
    await supabase.from('reputation_events').insert({
      character_id: characterId,
      faction_id: faction.id,
      delta,
      reason,
      source,
    }).catch(() => {})
  }

  return updateReputation(characterId, factionSlug, delta)
}

// Re-export STAGE_THRESHOLDS for potential future use
export { STAGE_THRESHOLDS }

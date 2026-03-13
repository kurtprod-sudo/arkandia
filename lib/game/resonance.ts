// ---------------------------------------------------------------------------
// Lógica de Ressonância e level de Ressonância
// Referência: GDD_Personagem §6
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'

const RESONANCE_UPGRADE_COST = 50 // Essências por nível (valor provisório — mover para seed SQL)
const RESONANCE_ETER_BONUS_PER_LEVEL = 10 // Éter máximo ganho por nível de Ressonância

/**
 * Ativa a Ressonância de um personagem (GM ou evento narrativo).
 * Define o archetype e marca is_resonance_unlocked = true.
 */
export async function unlockResonance(
  characterId: string,
  archetype: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('characters')
    .update({
      resonance_archetype: archetype,
      resonance_level: 1,
      is_resonance_unlocked: true,
    })
    .eq('id', characterId)

  if (error) return { success: false, error: error.message }

  await createEvent(supabase, {
    type: 'resonance_unlocked',
    actorId: characterId,
    metadata: { archetype },
    isPublic: true,
    narrativeText: `A Ressonância desperta. O Arquétipo da ${archetype.charAt(0).toUpperCase() + archetype.slice(1)} emerge das profundezas da alma.`,
  })

  return { success: true }
}

/**
 * Aumenta o level de Ressonância do personagem.
 * Custa Essências. Expande Éter máximo.
 * Referência: GDD_Personagem §6
 */
export async function upgradeResonanceLevel(
  characterId: string,
  userId: string
): Promise<{ success: boolean; error?: string; newLevel?: number }> {
  const supabase = await createClient()

  // Verifica ownership e estado atual
  const { data: character } = await supabase
    .from('characters')
    .select('id, resonance_level, is_resonance_unlocked')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()

  if (!character) return { success: false, error: 'Personagem não encontrado.' }
  if (!character.is_resonance_unlocked) {
    return { success: false, error: 'Ressonância ainda não desbloqueada.' }
  }

  // Verifica Essência
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('essencia')
    .eq('character_id', characterId)
    .single()

  if (!wallet || wallet.essencia < RESONANCE_UPGRADE_COST) {
    return { success: false, error: 'Essência insuficiente.' }
  }

  const currentLevel = character.resonance_level ?? 1
  const newLevel = currentLevel + 1

  // Debita Essência
  await supabase
    .from('character_wallet')
    .update({ essencia: wallet.essencia - RESONANCE_UPGRADE_COST })
    .eq('character_id', characterId)

  // Atualiza level de Ressonância
  await supabase
    .from('characters')
    .update({ resonance_level: newLevel })
    .eq('id', characterId)

  // Expande Éter máximo
  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('eter_max')
    .eq('character_id', characterId)
    .single()

  if (attrs) {
    const newEterMax = attrs.eter_max + RESONANCE_ETER_BONUS_PER_LEVEL
    await supabase
      .from('character_attributes')
      .update({ eter_max: newEterMax })
      .eq('character_id', characterId)
  }

  await createEvent(supabase, {
    type: 'resonance_upgraded',
    actorId: characterId,
    metadata: { new_level: newLevel, essencia_cost: RESONANCE_UPGRADE_COST },
    isPublic: false,
    narrativeText: `Ressonância aprofundada. Nível ${newLevel} atingido.`,
  })

  return { success: true, newLevel }
}

/**
 * Retorna as Maestrias de Ressonância disponíveis para um personagem.
 * Filtra por archetype e level mínimo de Ressonância.
 */
export async function getResonanceMaestrias(
  resonanceType: string,
  resonanceLevel: number
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('maestrias')
    .select('*')
    .eq('category', 'ressonância')
    .eq('is_active', true)
    .is('exhausted_by', null)

  if (error) throw error

  // Filtra por archetype e level de ressonância nas restrictions
  return (data ?? []).filter((m) => {
    const r = m.restrictions as Record<string, unknown> | null
    if (!r) return false
    if (r.resonance_type && r.resonance_type !== resonanceType) return false
    if (r.min_resonance_level && (r.min_resonance_level as number) > resonanceLevel) return false
    return true
  })
}

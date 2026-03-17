// ---------------------------------------------------------------------------
// Sistema de Maestrias — Prestígio e Ressonância
// Referência: GDD_Personagem §9
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'

/**
 * Retorna Maestrias de Prestígio disponíveis para a classe do personagem.
 */
export async function getPrestigiaMaestrias(classId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('maestrias')
    .select('*')
    .eq('category', 'prestígio')
    .eq('is_active', true)
  if (error) throw error

  return (data ?? []).filter((m) => {
    const r = m.restrictions as Record<string, unknown> | null
    if (!r) return true
    if (r.class_id && r.class_id !== classId) return false
    if (r.class_ids && !(r.class_ids as string[]).includes(classId)) return false
    return true
  })
}

/**
 * Retorna Maestrias de Ressonância disponíveis para o Arquétipo do personagem.
 */
export async function getResonanceMaestrias(
  resonanceArchetype: string,
  resonanceLevel: number
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('maestrias')
    .select('*')
    .eq('category', 'ressonância')
    .eq('is_active', true)
  if (error) throw error

  return (data ?? []).filter((m) => {
    const r = m.restrictions as Record<string, unknown> | null
    if (!r) return false
    if (r.resonance_type && r.resonance_type !== resonanceArchetype) return false
    if (r.min_resonance_level && (r.min_resonance_level as number) > resonanceLevel) return false
    return true
  })
}

/**
 * Retorna as Maestrias adquiridas por um personagem.
 */
export async function getCharacterMaestrias(characterId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('character_maestrias')
    .select('*, maestrias(*)')
    .eq('character_id', characterId)
  if (error) throw error
  return data ?? []
}

/**
 * Adquire uma Maestria de Prestígio ou Ressonância.
 */
export async function acquireMaestria(
  characterId: string,
  userId: string,
  maestriaId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica ownership + dados do personagem
  const { data: character } = await supabase
    .from('characters')
    .select('id, class_id, resonance_archetype, resonance_level, is_resonance_unlocked')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Verifica se completou as 8 skills (pré-requisito de maestrias)
  const { count: skillCount } = await supabase
    .from('character_skills')
    .select('id', { count: 'exact', head: true })
    .eq('character_id', characterId)
  if ((skillCount ?? 0) < 8) {
    return { success: false, error: 'Complete as 8 skills da árvore de Classe antes de adquirir Maestrias.' }
  }

  // Busca maestria
  const { data: maestria } = await supabase
    .from('maestrias')
    .select('*')
    .eq('id', maestriaId)
    .eq('is_active', true)
    .single()
  if (!maestria) return { success: false, error: 'Maestria não encontrada.' }

  const category = maestria.category as string
  const restrictions = (maestria.restrictions as Record<string, unknown>) ?? {}
  const cost = (maestria.cost as Record<string, unknown>) ?? {}

  // Valida categoria
  if (!['prestígio', 'ressonância'].includes(category)) {
    return { success: false, error: 'Use a Vitrine Sazonal para Maestrias Lendárias.' }
  }

  // Valida restrições de Prestígio
  if (category === 'prestígio') {
    if (restrictions.class_id && restrictions.class_id !== character.class_id) {
      return { success: false, error: 'Esta Maestria não pertence à sua Classe.' }
    }
    if (restrictions.class_ids) {
      const allowed = restrictions.class_ids as string[]
      if (!allowed.includes(character.class_id as string)) {
        return { success: false, error: 'Esta Maestria não pertence à sua Classe.' }
      }
    }
  }

  // Valida restrições de Ressonância
  if (category === 'ressonância') {
    if (!character.is_resonance_unlocked) {
      return { success: false, error: 'Ressonância ainda não despertou.' }
    }
    if (restrictions.resonance_type && restrictions.resonance_type !== character.resonance_archetype) {
      return { success: false, error: 'Esta Maestria pertence a outro Arquétipo.' }
    }
    if (restrictions.min_resonance_level) {
      const minLevel = restrictions.min_resonance_level as number
      if ((character.resonance_level ?? 1) < minLevel) {
        return { success: false, error: `Requer Ressonância nível ${minLevel}.` }
      }
    }
  }

  // Valida level mínimo do personagem
  if (restrictions.min_level) {
    const { data: charLevel } = await supabase
      .from('characters').select('level').eq('id', characterId).single()
    if ((charLevel?.level ?? 1) < (restrictions.min_level as number)) {
      return { success: false, error: `Requer nível ${restrictions.min_level}.` }
    }
  }

  // Verifica se já possui
  const { data: existing } = await supabase
    .from('character_maestrias')
    .select('id')
    .eq('character_id', characterId)
    .eq('maestria_id', maestriaId)
    .maybeSingle()
  if (existing) return { success: false, error: 'Você já possui esta Maestria.' }

  // Verifica e debita Essência
  const essenciaCost = (cost.essencia as number) ?? 0
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('essencia')
    .eq('character_id', characterId)
    .single()
  if (!wallet || wallet.essencia < essenciaCost) {
    return { success: false, error: `Essência insuficiente. Necessário: ${essenciaCost}.` }
  }

  // Para Prestígio: verifica Pergaminho no inventário
  if (category === 'prestígio' && cost.requires_item) {
    const { data: pergaminho } = await supabase
      .from('items')
      .select('id')
      .eq('name', cost.requires_item as string)
      .maybeSingle()

    if (pergaminho) {
      const { data: invItem } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('character_id', characterId)
        .eq('item_id', pergaminho.id)
        .maybeSingle()

      if (!invItem || invItem.quantity < 1) {
        return { success: false, error: `Requer: ${cost.requires_item as string}.` }
      }

      // Consome o Pergaminho
      if (invItem.quantity === 1) {
        await supabase.from('inventory').delete().eq('id', invItem.id)
      } else {
        await supabase.from('inventory').update({ quantity: invItem.quantity - 1 }).eq('id', invItem.id)
      }
    }
  }

  // Debita Essência
  if (essenciaCost > 0) {
    await supabase
      .from('character_wallet')
      .update({ essencia: wallet.essencia - essenciaCost })
      .eq('character_id', characterId)
  }

  // Registra Maestria adquirida
  const { error: insertError } = await supabase
    .from('character_maestrias')
    .insert({ character_id: characterId, maestria_id: maestriaId })
  if (insertError) return { success: false, error: 'Erro ao adquirir Maestria.' }

  await createEvent(supabase, {
    type: 'maestria_acquired',
    actorId: characterId,
    metadata: { maestria_name: maestria.name, category, essencia_cost: essenciaCost },
    isPublic: true,
    narrativeText: `${maestria.name as string} — Maestria ${category === 'prestígio' ? 'de Prestígio' : 'de Ressonância'} adquirida.`,
  })

  const { checkAchievements } = await import('./achievements')
  await checkAchievements(characterId, 'maestria_learned', {}).catch(() => {})

  return { success: true }
}

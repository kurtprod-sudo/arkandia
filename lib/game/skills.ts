// ---------------------------------------------------------------------------
// Sistema de Skills e Building
// Referência: GDD_Personagem §7 e §8
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'

/**
 * Retorna as 8 skills da árvore básica de uma classe.
 * Ordenadas por tree_position.
 */
export async function getClassSkillTree(classId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('class_id', classId)
    .order('tree_position', { nullsFirst: false })
  if (error) throw error
  return data ?? []
}

/**
 * Retorna as skills adquiridas por um personagem.
 */
export async function getCharacterSkills(characterId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('character_skills')
    .select('*, skills(*)')
    .eq('character_id', characterId)
  if (error) throw error
  return data ?? []
}

/**
 * Retorna o building atual de um personagem (6 slots).
 */
export async function getCharacterBuilding(characterId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('character_building')
    .select('slot, skill_id, skills(id, name, skill_type, eter_cost, range_state)')
    .eq('character_id', characterId)
    .order('slot')
  if (error) throw error
  return data ?? []
}

/**
 * Adquire uma skill para o personagem.
 * Valida: skill pertence à classe, personagem não tem ainda,
 * personagem tem Essência suficiente.
 * Se após adquirir o total de skills chegar a 8, registra evento
 * de desbloqueio de Maestrias.
 * Referência: GDD_Personagem §7
 */
export async function acquireSkill(
  characterId: string,
  skillId: string,
  userId: string
): Promise<{ success: boolean; error?: string; maestriasUnlocked?: boolean }> {
  const supabase = await createClient()

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id, class_id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Verifica se skill pertence à classe do personagem
  const { data: skill } = await supabase
    .from('skills')
    .select('id, class_id, name')
    .eq('id', skillId)
    .single()
  if (!skill) return { success: false, error: 'Skill não encontrada.' }
  if (skill.class_id !== character.class_id) {
    return { success: false, error: 'Esta skill não pertence à sua classe.' }
  }

  // Verifica se já tem a skill
  const { data: existing } = await supabase
    .from('character_skills')
    .select('id')
    .eq('character_id', characterId)
    .eq('skill_id', skillId)
    .maybeSingle()
  if (existing) return { success: false, error: 'Você já possui esta skill.' }

  // Verifica e debita Essência (custo fixo: 10 por skill — mover para seed SQL)
  const SKILL_ESSENCIA_COST = 10
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('essencia')
    .eq('character_id', characterId)
    .single()
  if (!wallet || wallet.essencia < SKILL_ESSENCIA_COST) {
    return { success: false, error: 'Essência insuficiente.' }
  }

  // Debita Essência
  const { error: walletError } = await supabase
    .from('character_wallet')
    .update({ essencia: wallet.essencia - SKILL_ESSENCIA_COST })
    .eq('character_id', characterId)
  if (walletError) return { success: false, error: 'Erro ao debitar Essência.' }

  // Registra skill adquirida
  const { error: skillError } = await supabase
    .from('character_skills')
    .insert({ character_id: characterId, skill_id: skillId })
  if (skillError) return { success: false, error: 'Erro ao adquirir skill.' }

  // Verifica se desbloqueou Maestrias (8 skills adquiridas)
  const { count } = await supabase
    .from('character_skills')
    .select('id', { count: 'exact', head: true })
    .eq('character_id', characterId)
  const totalSkills = count ?? 0
  const maestriasUnlocked = totalSkills >= 8

  // Registra evento
  const { createEvent } = await import('./events')
  await createEvent(supabase, {
    type: 'skill_acquired',
    actorId: characterId,
    metadata: { skill_id: skillId, skill_name: skill.name, essencia_cost: SKILL_ESSENCIA_COST },
    isPublic: false,
    narrativeText: maestriasUnlocked
      ? `${skill.name} dominada. O caminho das Maestrias se abre.`
      : `${skill.name} aprendida.`,
  })

  return { success: true, maestriasUnlocked }
}

/**
 * Atualiza o building do personagem.
 * Valida: máximo 6 slots, sem duplicatas, skills pertencem ao personagem.
 * Regra inviolável: validado no servidor, nunca só no cliente.
 * Referência: GDD_Personagem §8
 */
export async function updateBuilding(
  characterId: string,
  userId: string,
  slots: Array<{ slot: number; skill_id: string | null }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Valida slots — máximo 6, números 1-6
  if (slots.length > 6) return { success: false, error: 'Máximo 6 slots.' }
  const invalidSlot = slots.find((s) => s.slot < 1 || s.slot > 6)
  if (invalidSlot) return { success: false, error: 'Slot inválido.' }

  // Valida duplicatas de skill
  const skillIds = slots.map((s) => s.skill_id).filter(Boolean) as string[]
  const uniqueSkillIds = new Set(skillIds)
  if (skillIds.length !== uniqueSkillIds.size) {
    return { success: false, error: 'Não é possível equipar a mesma skill em dois slots.' }
  }

  // Valida que todas as skills pertencem ao personagem
  if (skillIds.length > 0) {
    const { data: ownedSkills } = await supabase
      .from('character_skills')
      .select('skill_id')
      .eq('character_id', characterId)
      .in('skill_id', skillIds)
    const ownedIds = new Set((ownedSkills ?? []).map((s) => s.skill_id))
    const unowned = skillIds.find((id) => !ownedIds.has(id))
    if (unowned) return { success: false, error: 'Skill não adquirida.' }
  }

  // Upsert dos slots
  const upserts = slots.map((s) => ({
    character_id: characterId,
    slot: s.slot,
    skill_id: s.skill_id,
    equipment_item_id: null,
  }))

  const { error } = await supabase
    .from('character_building')
    .upsert(upserts, { onConflict: 'character_id,slot' })
  if (error) return { success: false, error: 'Erro ao atualizar building.' }

  return { success: true }
}

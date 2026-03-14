import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'

/**
 * Concede um título a um personagem.
 * Valida: título único não pode ser concedido duas vezes no servidor.
 */
export async function grantTitle(
  characterId: string,
  titleId: string,
  grantedBy: 'system' | 'gm' = 'system'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: titleDef } = await supabase
    .from('title_definitions')
    .select('id, name, is_unique')
    .eq('id', titleId)
    .single()
  if (!titleDef) return { success: false, error: 'Título não encontrado.' }

  if (titleDef.is_unique) {
    const { count } = await supabase
      .from('character_titles')
      .select('id', { count: 'exact', head: true })
      .eq('title_id', titleId)
    if ((count ?? 0) > 0) {
      return { success: false, error: 'Este título já foi concedido a outro personagem.' }
    }
  }

  const { data: existing } = await supabase
    .from('character_titles')
    .select('id')
    .eq('character_id', characterId)
    .eq('title_id', titleId)
    .maybeSingle()
  if (existing) return { success: false, error: 'Personagem já possui este título.' }

  const { error } = await supabase
    .from('character_titles')
    .insert({ character_id: characterId, title_id: titleId, granted_by: grantedBy })
  if (error) return { success: false, error: 'Erro ao conceder título.' }

  await createEvent(supabase, {
    type: 'title_granted',
    actorId: characterId,
    metadata: { title_id: titleId, title_name: titleDef.name, granted_by: grantedBy },
    isPublic: true,
    narrativeText: `${titleDef.name} — novo título concedido.`,
  })

  return { success: true }
}

/**
 * Define o título ativo exibido pelo personagem.
 * Referência: GDD_Sistemas §6.3
 */
export async function setActiveTitle(
  characterId: string,
  userId: string,
  titleName: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  if (titleName !== null) {
    const { data: titleDef } = await supabase
      .from('title_definitions')
      .select('id')
      .eq('name', titleName)
      .single()

    if (!titleDef) return { success: false, error: 'Título não encontrado.' }

    const { data: owned } = await supabase
      .from('character_titles')
      .select('id')
      .eq('character_id', characterId)
      .eq('title_id', titleDef.id)
      .maybeSingle()
    if (!owned) return { success: false, error: 'Você não possui este título.' }
  }

  await supabase
    .from('characters')
    .update({ title: titleName })
    .eq('id', characterId)

  return { success: true }
}

/**
 * Retorna todos os títulos de um personagem.
 */
export async function getCharacterTitles(characterId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('character_titles')
    .select('*, title_definitions(name, description, category)')
    .eq('character_id', characterId)
    .order('granted_at', { ascending: false })
  return data ?? []
}

/**
 * Verifica e concede títulos automáticos baseado em eventos.
 * Chamado após ações relevantes do jogador.
 */
export async function checkAutoTitles(
  characterId: string,
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()

  const { data: triggers } = await supabase
    .from('title_definitions')
    .select('*')
    .eq('trigger_type', 'automatico')

  for (const titleDef of triggers ?? []) {
    const condition = titleDef.trigger_condition as Record<string, unknown>
    if (condition?.event !== eventType) continue

    const { data: existing } = await supabase
      .from('character_titles')
      .select('id')
      .eq('character_id', characterId)
      .eq('title_id', titleDef.id)
      .maybeSingle()
    if (existing) continue

    let conditionMet = true

    if (condition.min_wars) {
      const { count } = await supabase
        .from('war_participants')
        .select('id', { count: 'exact', head: true })
        .eq('character_id', characterId)
      conditionMet = (count ?? 0) >= (condition.min_wars as number)
    }

    if (condition.total && eventType === 'expedition_completed') {
      const { count } = await supabase
        .from('expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('character_id', characterId)
        .eq('status', 'completed')
      conditionMet = (count ?? 0) >= (condition.total as number)
    }

    if (conditionMet) {
      await grantTitle(characterId, titleDef.id, 'system')
    }
  }
}

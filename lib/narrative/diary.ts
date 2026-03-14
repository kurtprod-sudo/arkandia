import { createClient } from '@/lib/supabase/server'

export type DiaryReactionSymbol = 'chama' | 'espada' | 'estrela' | 'lacre' | 'corvo'

export const REACTION_LABELS: Record<DiaryReactionSymbol, string> = {
  chama:   '🔥 Chama',
  espada:  '⚔️ Espada',
  estrela: '✦ Estrela',
  lacre:   '🔏 Lacre',
  corvo:   '🐦 Corvo',
}

/**
 * Cria uma entrada no diário.
 */
export async function createDiaryEntry(
  characterId: string,
  userId: string,
  title: string,
  content: string
): Promise<{ success: boolean; error?: string; entryId?: string }> {
  const supabase = await createClient()

  if (!title.trim()) return { success: false, error: 'Título obrigatório.' }
  if (!content.trim()) return { success: false, error: 'Conteúdo obrigatório.' }
  if (title.length > 120) return { success: false, error: 'Título muito longo.' }
  if (content.length > 3000) return { success: false, error: 'Conteúdo muito longo.' }

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: entry, error } = await supabase
    .from('diary_entries')
    .insert({ character_id: characterId, title, content })
    .select()
    .single()
  if (error || !entry) return { success: false, error: 'Erro ao criar entrada.' }

  return { success: true, entryId: entry.id }
}

/**
 * Edita uma entrada do diário. Apenas owner pode editar.
 */
export async function updateDiaryEntry(
  entryId: string,
  userId: string,
  title: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  if (!title.trim()) return { success: false, error: 'Título obrigatório.' }
  if (!content.trim()) return { success: false, error: 'Conteúdo obrigatório.' }

  // Verifica ownership
  const { data: entry } = await supabase
    .from('diary_entries')
    .select('character_id')
    .eq('id', entryId)
    .single()
  if (!entry) return { success: false, error: 'Entrada não encontrada.' }

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', entry.character_id)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  await supabase
    .from('diary_entries')
    .update({ title, content })
    .eq('id', entryId)

  return { success: true }
}

/**
 * Deleta uma entrada do diário.
 */
export async function deleteDiaryEntry(
  entryId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: entry } = await supabase
    .from('diary_entries')
    .select('character_id')
    .eq('id', entryId)
    .single()
  if (!entry) return { success: false, error: 'Entrada não encontrada.' }

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', entry.character_id)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  await supabase.from('diary_entries').delete().eq('id', entryId)
  return { success: true }
}

/**
 * Reage a uma entrada do diário com um símbolo temático.
 * Toggle: remove reação se já existe com o mesmo símbolo.
 */
export async function reactToDiaryEntry(
  entryId: string,
  characterId: string,
  userId: string,
  symbol: DiaryReactionSymbol
): Promise<{ success: boolean; error?: string; added: boolean }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.', added: false }

  // Verifica reação existente
  const { data: existing } = await supabase
    .from('diary_reactions')
    .select('id, symbol')
    .eq('entry_id', entryId)
    .eq('character_id', characterId)
    .maybeSingle()

  if (existing) {
    if (existing.symbol === symbol) {
      // Remove reação (toggle off)
      await supabase.from('diary_reactions').delete().eq('id', existing.id)
      return { success: true, added: false }
    } else {
      // Troca símbolo
      await supabase
        .from('diary_reactions')
        .update({ symbol })
        .eq('id', existing.id)
      return { success: true, added: true }
    }
  }

  // Adiciona nova reação
  await supabase.from('diary_reactions').insert({
    entry_id: entryId,
    character_id: characterId,
    symbol,
  })
  return { success: true, added: true }
}

/**
 * Retorna entradas do diário de um personagem com contagem de reações.
 */
export async function getDiaryEntries(characterId: string, limit = 20) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('diary_entries')
    .select('*, diary_reactions(symbol)')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

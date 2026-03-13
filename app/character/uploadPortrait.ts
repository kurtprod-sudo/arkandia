'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function uploadPortrait(
  formData: FormData
): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autenticado.' }

  const file = formData.get('portrait') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Formato inválido. Use JPG, PNG ou WebP.' }
  if (file.size > MAX_SIZE) return { error: 'Arquivo muito grande. Máximo 2MB.' }

  // Fetch character to confirm ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!character) return { error: 'Personagem não encontrado.' }

  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${user.id}/portrait.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('portraits')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: publicData } = supabase.storage.from('portraits').getPublicUrl(path)
  const url = `${publicData.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('characters')
    .update({ avatar_url: url })
    .eq('id', character.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/character')
  return { url }
}

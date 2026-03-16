'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { gmCreateWorldEvent, gmEndWorldEvent, type WorldEventType } from '@/lib/game/world_events'

async function assertGM() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gm') throw new Error('Acesso negado.')
  const { data: ch } = await supabase.from('characters').select('id').eq('user_id', user.id).single()
  return { user, characterId: ch?.id ?? '' }
}

export async function gmCreateWorldEventAction(input: {
  type: WorldEventType; title: string; description: string; metadata: Record<string, unknown>
}) {
  const { characterId } = await assertGM()
  const result = await gmCreateWorldEvent({ gmCharacterId: characterId, ...input })
  revalidatePath('/events')
  revalidatePath('/gm')
  return result
}

export async function gmEndWorldEventAction(eventId: string) {
  const { characterId } = await assertGM()
  const result = await gmEndWorldEvent(eventId, characterId)
  revalidatePath('/events')
  revalidatePath('/gm')
  return result
}

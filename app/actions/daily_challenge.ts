'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateDailyChallenge, acceptDailyChallenge } from '@/lib/game/daily_challenge'

export async function generateDailyChallengeAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }
  const { data: ch } = await supabase.from('characters').select('id').eq('user_id', user.id).single()
  if (!ch) return { success: false, error: 'Personagem não encontrado.' }
  const result = await generateDailyChallenge(ch.id, user.id)
  revalidatePath('/home')
  return result
}

export async function acceptDailyChallengeAction(challengeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }
  const result = await acceptDailyChallenge(challengeId, user.id)
  revalidatePath('/home')
  revalidatePath('/battle')
  return result
}

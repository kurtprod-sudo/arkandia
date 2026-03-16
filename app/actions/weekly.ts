'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { claimWeeklyReward } from '@/lib/game/weekly'

export async function claimWeeklyRewardAction(missionIndex: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const result = await claimWeeklyReward(character.id, user.id, missionIndex)
  revalidatePath('/home')
  return result
}

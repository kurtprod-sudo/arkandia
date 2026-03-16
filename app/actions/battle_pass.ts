'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { claimTierReward, purchasePremium } from '@/lib/game/battle_pass'

export async function claimTierRewardAction(tier: number, track: 'free' | 'premium') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }
  const { data: ch } = await supabase.from('characters').select('id').eq('user_id', user.id).single()
  if (!ch) return { success: false, error: 'Personagem não encontrado.' }
  const result = await claimTierReward(ch.id, user.id, tier, track)
  revalidatePath('/battle-pass')
  return result
}

export async function purchasePremiumAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }
  const { data: ch } = await supabase.from('characters').select('id').eq('user_id', user.id).single()
  if (!ch) return { success: false, error: 'Personagem não encontrado.' }
  const result = await purchasePremium(ch.id, user.id)
  revalidatePath('/battle-pass')
  return result
}

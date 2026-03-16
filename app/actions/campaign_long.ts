'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { startStageCombat, completeStage } from '@/lib/game/campaign_long'

async function getAuth(): Promise<{ characterId: string; userId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: ch } = await supabase.from('characters').select('id').eq('user_id', user.id).single()
  if (!ch) return null
  return { characterId: ch.id, userId: user.id }
}

export async function startStageCombatAction(
  campaignSlug: string,
  chapterNumber: number,
  stageNumber: number,
  difficulty: 'normal' | 'hard'
) {
  const auth = await getAuth()
  if (!auth) return { success: false, error: 'Não autenticado.' }
  return startStageCombat(
    auth.characterId, auth.userId, campaignSlug,
    chapterNumber, stageNumber, difficulty
  )
}

export async function completeStageAction(
  campaignSlug: string,
  chapterNumber: number,
  stageNumber: number,
  difficulty: 'normal' | 'hard',
  combatSessionId: string
) {
  const auth = await getAuth()
  if (!auth) return { success: false, error: 'Não autenticado.' }
  const result = await completeStage(
    auth.characterId, auth.userId, campaignSlug,
    chapterNumber, stageNumber, difficulty, combatSessionId
  )
  revalidatePath('/campaign')
  revalidatePath('/campaign/aventura')
  return result
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  startCampaign,
  makeChapterChoice,
  startChapterCombat,
  completeChapter,
} from '@/lib/game/campaign'

async function getCharacterId(): Promise<{ characterId: string; userId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: ch } = await supabase.from('characters').select('id').eq('user_id', user.id).single()
  if (!ch) return null
  return { characterId: ch.id, userId: user.id }
}

export async function startCampaignAction(campaignSlug: string) {
  const auth = await getCharacterId()
  if (!auth) return { success: false, error: 'Não autenticado.' }
  const result = await startCampaign(auth.characterId, campaignSlug)
  revalidatePath('/campaign')
  return result
}

export async function makeChapterChoiceAction(campaignSlug: string, choiceIndex: number) {
  const auth = await getCharacterId()
  if (!auth) return { success: false, error: 'Não autenticado.' }
  const result = await makeChapterChoice(auth.characterId, campaignSlug, choiceIndex)
  revalidatePath('/campaign')
  return result
}

export async function startChapterCombatAction(campaignSlug: string) {
  const auth = await getCharacterId()
  if (!auth) return { success: false, error: 'Não autenticado.' }
  const result = await startChapterCombat(auth.characterId, campaignSlug, auth.userId)
  revalidatePath('/campaign')
  return result
}

export async function completeChapterAction(campaignSlug: string) {
  const auth = await getCharacterId()
  if (!auth) return { success: false, error: 'Não autenticado.' }
  const result = await completeChapter(auth.characterId, campaignSlug)
  revalidatePath('/campaign')
  return result
}

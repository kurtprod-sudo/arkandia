'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { enqueueRecruitment, type TroopType, type TroopDeployment } from '@/lib/game/troops'
import { startTroopExpedition } from '@/lib/game/expedition'

async function getCharacterId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  return { userId: user.id, characterId: character?.id ?? null }
}

export async function enqueueRecruitmentAction(
  troopType: TroopType
): Promise<{ success: boolean; error?: string; endsAt?: string }> {
  const auth = await getCharacterId()
  if (!auth?.characterId) return { success: false, error: 'Não autenticado.' }

  const result = await enqueueRecruitment(auth.characterId, auth.userId, troopType)
  revalidatePath('/battle/troops')
  return result
}

export async function startTroopExpeditionAction(
  expeditionTypeId: string,
  deployment: TroopDeployment
): Promise<{ success: boolean; error?: string; expeditionId?: string }> {
  const auth = await getCharacterId()
  if (!auth?.characterId) return { success: false, error: 'Não autenticado.' }

  const result = await startTroopExpedition(auth.characterId, auth.userId, expeditionTypeId, deployment)
  revalidatePath('/battle/troops')
  return result
}

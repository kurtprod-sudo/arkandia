'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createEvent } from '@/lib/game/events'
import { type GMGrantCurrencyPayload, type GMEditAttributePayload } from '@/types'

async function assertGM() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autenticado.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'gm') {
    throw new Error('Acesso negado.')
  }

  return supabase
}

export async function gmGrantCurrency(payload: GMGrantCurrencyPayload) {
  const supabase = await assertGM()

  // Busca saldo atual
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('libras, essencia, premium_currency')
    .eq('character_id', payload.character_id)
    .single()

  if (!wallet) return { error: 'Carteira não encontrada.' }

  const currentVal = wallet[payload.currency] as number
  const { error } = await supabase
    .from('character_wallet')
    .update({ [payload.currency]: currentVal + payload.amount })
    .eq('character_id', payload.character_id)

  if (error) return { error: error.message }

  await createEvent(supabase, {
    type: 'currency_granted',
    targetId: payload.character_id,
    metadata: { currency: payload.currency, amount: payload.amount },
    isPublic: false,
  })

  revalidatePath('/gm')
  return { success: true }
}

export async function gmEditAttributes(payload: GMEditAttributePayload) {
  const supabase = await assertGM()

  const { error } = await supabase
    .from('character_attributes')
    .update(payload.attributes)
    .eq('character_id', payload.character_id)

  if (error) return { error: error.message }

  await createEvent(supabase, {
    type: 'gm_override',
    targetId: payload.character_id,
    metadata: { changed: payload.attributes as Record<string, unknown> },
    isPublic: false,
  })

  revalidatePath('/gm')
  return { success: true }
}

export async function gmEditCharacterStatus(
  characterId: string,
  status: 'active' | 'injured' | 'dead'
) {
  const supabase = await assertGM()

  const { error } = await supabase
    .from('characters')
    .update({ status })
    .eq('id', characterId)

  if (error) return { error: error.message }

  await createEvent(supabase, {
    type: 'gm_override',
    targetId: characterId,
    metadata: { status_changed_to: status },
    isPublic: false,
  })

  revalidatePath('/gm')
  return { success: true }
}

/**
 * Ativa a Ressonância de um personagem manualmente.
 * Simula o evento narrativo da campanha inicial (nível 5).
 * Referência: GDD_Personagem §6
 */
export async function gmUnlockResonance(
  characterId: string,
  archetype: string
) {
  await assertGM()

  const { unlockResonance } = await import('@/lib/game/resonance')
  const result = await unlockResonance(characterId, archetype)

  revalidatePath('/gm')
  return result
}

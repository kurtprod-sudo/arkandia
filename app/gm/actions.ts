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

export async function gmUpdateReputation(
  characterId: string,
  factionSlug: string,
  delta: number
) {
  await assertGM()
  const { updateReputation } = await import('@/lib/game/reputation')
  const result = await updateReputation(characterId, factionSlug, delta)
  revalidatePath('/gm')
  return result
}

export async function gmGenerateJournal() {
  await assertGM()
  const { generateDailyEdition } = await import('@/lib/narrative/journal')
  const result = await generateDailyEdition()
  revalidatePath('/gm')
  return result
}

export async function gmPublishJournal(editionId: string) {
  await assertGM()
  const { publishEdition } = await import('@/lib/narrative/journal')
  const result = await publishEdition(editionId)
  revalidatePath('/gm')
  revalidatePath('/journal')
  revalidatePath('/dashboard')
  return result
}

export async function gmArchiveJournal(editionId: string) {
  await assertGM()
  const supabase = await createClient()
  await supabase
    .from('journal_editions')
    .update({ status: 'archived' })
    .eq('id', editionId)
  revalidatePath('/gm')
  return { success: true }
}

export async function gmCreateScenario(data: {
  name: string
  description: string
  location: string
  maxPlayers: number
}) {
  await assertGM()
  const supabase = await createClient()
  const { error } = await supabase
    .from('social_scenarios')
    .insert({
      name: data.name,
      description: data.description,
      location: data.location,
      max_players: data.maxPlayers,
      is_active: true,
    })
  revalidatePath('/scenarios')
  revalidatePath('/gm')
  return { success: !error, error: error?.message }
}

export async function gmCloseScenario(scenarioId: string) {
  await assertGM()
  const supabase = await createClient()

  // Remove todos os presentes primeiro
  await supabase
    .from('scenario_presence')
    .delete()
    .eq('scenario_id', scenarioId)

  // Desativa o cenário
  await supabase
    .from('social_scenarios')
    .update({ is_active: false })
    .eq('id', scenarioId)

  revalidatePath('/scenarios')
  revalidatePath('/gm')
  return { success: true }
}

export async function gmRemoveFromScenario(
  scenarioId: string,
  characterId: string
) {
  await assertGM()
  const supabase = await createClient()
  await supabase
    .from('scenario_presence')
    .delete()
    .eq('scenario_id', scenarioId)
    .eq('character_id', characterId)
  revalidatePath('/gm')
  return { success: true }
}

export async function gmAssignTerritory(
  territoryId: string,
  societyId: string | null
) {
  await assertGM()
  const supabase = await createClient()

  const safezoneUntil = societyId
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h safezone
    : null

  await supabase
    .from('territories')
    .update({
      controlling_society_id: societyId,
      safezone_until: safezoneUntil,
    })
    .eq('id', territoryId)

  // Se atribuindo a uma sociedade, cria registro de produção
  if (societyId) {
    await supabase
      .from('territory_production')
      .upsert({
        territory_id: territoryId,
        society_id: societyId,
        last_collected: new Date().toISOString(),
        reinvestment_level: 0,
      }, { onConflict: 'territory_id' })
  } else {
    // Remove produção ao retirar controle
    await supabase
      .from('territory_production')
      .delete()
      .eq('territory_id', territoryId)
  }

  revalidatePath('/map')
  revalidatePath('/gm')
  return { success: true }
}

export async function gmSetSocietyLevel(
  societyId: string,
  level: number
) {
  await assertGM()
  const supabase = await createClient()
  await supabase
    .from('societies')
    .update({ level })
    .eq('id', societyId)
  revalidatePath('/gm')
  return { success: true }
}

export async function gmResolveBattle(warId: string) {
  await assertGM()
  const { resolveBattle } = await import('@/lib/game/war')
  const result = await resolveBattle(warId)
  revalidatePath(`/war/${warId}`)
  revalidatePath('/map')
  revalidatePath('/gm')
  return result
}

export async function gmCancelWar(warId: string) {
  await assertGM()
  const supabase = await createClient()
  await supabase
    .from('war_declarations')
    .update({ status: 'cancelled', finished_at: new Date().toISOString() })
    .eq('id', warId)
  revalidatePath('/gm')
  revalidatePath('/map')
  return { success: true }
}

export async function gmGrantItem(
  characterId: string,
  itemId: string,
  quantity: number
) {
  await assertGM()
  const { addToInventory } = await import('@/lib/game/market')
  const result = await addToInventory(characterId, itemId, quantity)
  revalidatePath('/gm')
  return result
}

export async function gmFinalizeAuction(auctionId: string) {
  await assertGM()
  const { finalizeAuction } = await import('@/lib/game/market')
  const result = await finalizeAuction(auctionId)
  revalidatePath('/market')
  revalidatePath('/gm')
  return result
}

export async function gmCreateSummonCatalog(data: {
  name: string
  description: string
  costGemas: number
  costTickets: number
  pityThreshold: number
}) {
  await assertGM()
  const supabase = await createClient()
  const { data: catalog, error } = await supabase
    .from('summon_catalogs')
    .insert({
      name: data.name,
      description: data.description,
      cost_gemas: data.costGemas,
      cost_tickets: data.costTickets,
      pity_threshold: data.pityThreshold,
      is_active: true,
    })
    .select()
    .single()
  revalidatePath('/summon')
  revalidatePath('/gm')
  return { success: !error, catalogId: catalog?.id, error: error?.message }
}

export async function gmAddCatalogItem(data: {
  catalogId: string
  itemId: string
  quantity: number
  weight: number
  isPityEligible: boolean
}) {
  await assertGM()
  const supabase = await createClient()
  const { error } = await supabase
    .from('summon_catalog_items')
    .insert({
      catalog_id: data.catalogId,
      item_id: data.itemId,
      quantity: data.quantity,
      weight: data.weight,
      is_pity_eligible: data.isPityEligible,
    })
  revalidatePath('/summon')
  revalidatePath('/gm')
  return { success: !error, error: error?.message }
}

export async function gmToggleCatalog(catalogId: string, isActive: boolean) {
  await assertGM()
  const supabase = await createClient()
  await supabase
    .from('summon_catalogs')
    .update({ is_active: isActive })
    .eq('id', catalogId)
  revalidatePath('/summon')
  revalidatePath('/gm')
  return { success: true }
}

export async function gmGrantTicket(characterId: string, quantity = 1) {
  await assertGM()
  const supabase = await createClient()
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('summon_tickets')
    .eq('character_id', characterId)
    .single()
  if (!wallet) return { success: false, error: 'Carteira não encontrada.' }
  await supabase
    .from('character_wallet')
    .update({ summon_tickets: (wallet.summon_tickets ?? 0) + quantity })
    .eq('character_id', characterId)
  revalidatePath('/gm')
  return { success: true }
}

export async function gmGrantTitle(
  characterId: string,
  titleId: string
) {
  await assertGM()
  const { grantTitle } = await import('@/lib/game/titles')
  const result = await grantTitle(characterId, titleId, 'gm')
  revalidatePath('/gm')
  revalidatePath('/character')
  return result
}

export async function gmRevokeTitle(
  characterId: string,
  titleId: string
) {
  await assertGM()
  const supabase = await createClient()
  await supabase
    .from('character_titles')
    .delete()
    .eq('character_id', characterId)
    .eq('title_id', titleId)
  // Se era o título ativo, remove
  const { data: titleDef } = await supabase
    .from('title_definitions')
    .select('name')
    .eq('id', titleId)
    .single()
  if (titleDef) {
    await supabase
      .from('characters')
      .update({ title: null })
      .eq('id', characterId)
      .eq('title', titleDef.name)
  }
  revalidatePath('/gm')
  return { success: true }
}

export async function gmUpdateRankings() {
  await assertGM()
  const { updateAllRankings } = await import('@/lib/game/rankings')
  const result = await updateAllRankings()
  revalidatePath('/rankings')
  revalidatePath('/gm')
  return result
}

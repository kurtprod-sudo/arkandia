import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'
import { addToInventory } from './market'

export type SummonCostType = 'gemas' | 'ticket'

/**
 * Retorna o catálogo ativo com itens e probabilidades calculadas.
 * Exibe probabilidades ao jogador — sempre transparente.
 */
export async function getCatalogWithOdds(catalogId: string) {
  const supabase = await createClient()

  const { data: catalog } = await supabase
    .from('summon_catalogs')
    .select('*')
    .eq('id', catalogId)
    .eq('is_active', true)
    .single()
  if (!catalog) return null

  const { data: catalogItems } = await supabase
    .from('summon_catalog_items')
    .select('*, items(id, name, description, item_type, rarity)')
    .eq('catalog_id', catalogId)

  const items = catalogItems ?? []
  const totalWeight = items.reduce((sum, i) => sum + (i.weight ?? 0), 0)

  return {
    ...catalog,
    items: items.map((i) => ({
      ...i,
      probability: totalWeight > 0
        ? parseFloat(((i.weight / totalWeight) * 100).toFixed(2))
        : 0,
    })),
    total_weight: totalWeight,
  }
}

/**
 * Executa um summon para um personagem.
 * Valida custo, aplica pity, entrega item ao inventário.
 * Referência: GDD_Sistemas §4.4
 */
export async function performSummon(
  characterId: string,
  userId: string,
  catalogId: string,
  costType: SummonCostType
): Promise<{
  success: boolean
  error?: string
  result?: {
    itemId: string
    itemName: string
    itemRarity: string
    quantity: number
    wasPity: boolean
  }
}> {
  const supabase = await createClient()

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Busca catálogo ativo
  const { data: catalog } = await supabase
    .from('summon_catalogs')
    .select('*')
    .eq('id', catalogId)
    .eq('is_active', true)
    .single()
  if (!catalog) return { success: false, error: 'Catálogo não encontrado.' }

  // Verifica e debita custo
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('premium_currency, summon_tickets')
    .eq('character_id', characterId)
    .single()
  if (!wallet) return { success: false, error: 'Carteira não encontrada.' }

  if (costType === 'gemas') {
    if (wallet.premium_currency < catalog.cost_gemas) {
      return { success: false, error: `Gemas insuficientes. Custo: ${catalog.cost_gemas} Gemas.` }
    }
    await supabase
      .from('character_wallet')
      .update({ premium_currency: wallet.premium_currency - catalog.cost_gemas })
      .eq('character_id', characterId)
  } else {
    if ((wallet.summon_tickets ?? 0) < 1) {
      return { success: false, error: 'Nenhum Ticket de Summon disponível.' }
    }
    await supabase
      .from('character_wallet')
      .update({ summon_tickets: (wallet.summon_tickets ?? 0) - 1 })
      .eq('character_id', characterId)
  }

  // Busca pity atual
  const { data: pityRow } = await supabase
    .from('summon_pity')
    .select('*')
    .eq('character_id', characterId)
    .eq('catalog_id', catalogId)
    .maybeSingle()

  const pullsSinceRare = pityRow?.pulls_since_rare ?? 0
  const totalPulls = pityRow?.total_pulls ?? 0
  const isPityActivated = pullsSinceRare >= catalog.pity_threshold

  // Busca itens do catálogo
  const { data: catalogItems } = await supabase
    .from('summon_catalog_items')
    .select('*, items(id, name, item_type, rarity)')
    .eq('catalog_id', catalogId)

  if (!catalogItems || catalogItems.length === 0) {
    return { success: false, error: 'Catálogo sem itens configurados.' }
  }

  // Seleciona item
  let selectedItem: typeof catalogItems[0]
  let wasPity = false

  if (isPityActivated) {
    // Pity — sorteia apenas entre itens elegíveis para pity (raros+)
    const pityEligible = catalogItems.filter((i) => i.is_pity_eligible)
    if (pityEligible.length > 0) {
      const pityWeight = pityEligible.reduce((s, i) => s + i.weight, 0)
      const pityRoll = Math.random() * pityWeight
      let accumulated = 0
      selectedItem = pityEligible[pityEligible.length - 1]
      for (const item of pityEligible) {
        accumulated += item.weight
        if (pityRoll <= accumulated) {
          selectedItem = item
          break
        }
      }
      wasPity = true
    } else {
      selectedItem = catalogItems[0]
    }
  } else {
    // Sorteio normal por peso
    const totalWeight = catalogItems.reduce((s, i) => s + i.weight, 0)
    const roll = Math.random() * totalWeight
    let accumulated = 0
    selectedItem = catalogItems[catalogItems.length - 1]
    for (const item of catalogItems) {
      accumulated += item.weight
      if (roll <= accumulated) {
        selectedItem = item
        break
      }
    }
  }

  const itemData = selectedItem.items as Record<string, unknown>
  const itemRarity = itemData?.rarity as string ?? 'comum'
  const isRare = ['raro', 'epico', 'lendario'].includes(itemRarity)

  // Atualiza pity
  const newPullsSinceRare = (isRare || wasPity) ? 0 : pullsSinceRare + 1

  if (pityRow) {
    await supabase
      .from('summon_pity')
      .update({
        pulls_since_rare: newPullsSinceRare,
        total_pulls: totalPulls + 1,
      })
      .eq('character_id', characterId)
      .eq('catalog_id', catalogId)
  } else {
    await supabase
      .from('summon_pity')
      .insert({
        character_id: characterId,
        catalog_id: catalogId,
        pulls_since_rare: newPullsSinceRare,
        total_pulls: 1,
      })
  }

  // Entrega item ao inventário
  await addToInventory(characterId, selectedItem.item_id, selectedItem.quantity)

  // Registra histórico
  await supabase.from('summon_history').insert({
    character_id: characterId,
    catalog_id: catalogId,
    item_id: selectedItem.item_id,
    quantity: selectedItem.quantity,
    cost_type: costType,
    cost_amount: costType === 'gemas' ? catalog.cost_gemas : 1,
    was_pity: wasPity,
  })

  await createEvent(supabase, {
    type: 'summon_performed',
    actorId: characterId,
    metadata: {
      catalog_id: catalogId,
      item_id: selectedItem.item_id,
      item_rarity: itemRarity,
      was_pity: wasPity,
      cost_type: costType,
    },
    isPublic: isRare,
    narrativeText: isRare
      ? `${wasPity ? '[Pity] ' : ''}Item ${itemRarity} obtido via Summon!`
      : undefined,
  })

  return {
    success: true,
    result: {
      itemId: selectedItem.item_id,
      itemName: (itemData?.name as string) ?? 'Item',
      itemRarity,
      quantity: selectedItem.quantity,
      wasPity,
    },
  }
}

/**
 * Concede um Ticket de Summon ao personagem.
 * Chamado ao completar 5/5 daily tasks.
 */
export async function grantSummonTicket(
  characterId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('summon_tickets')
    .eq('character_id', characterId)
    .single()
  if (!wallet) return { success: false, error: 'Carteira não encontrada.' }

  await supabase
    .from('character_wallet')
    .update({ summon_tickets: (wallet.summon_tickets ?? 0) + 1 })
    .eq('character_id', characterId)

  return { success: true }
}

/**
 * Retorna histórico de summons de um personagem.
 */
export async function getSummonHistory(
  characterId: string,
  limit = 20
) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('summon_history')
    .select('*, items(name, rarity), summon_catalogs(name)')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

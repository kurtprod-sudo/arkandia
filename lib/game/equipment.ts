// ---------------------------------------------------------------------------
// Sistema de Equipamentos
// Referência: GDD_Personagem §11
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { calcHpMax } from './attributes'

// Custo de melhoria em Libras por nível
const ENHANCEMENT_COST_LIBRAS: Record<number, number> = {
  1: 50,     2: 100,    3: 200,    4: 400,
  5: 800,    6: 1500,   7: 3000,   8: 6000,
  9: 12000, 10: 25000, 11: 50000, 12: 100000,
}

// Materiais necessários por tier de melhoria
const ENHANCEMENT_MATERIALS: Record<string, { name: string; quantity: number }[]> = {
  tier1: [],
  tier2: [{ name: 'Minério Etéreo', quantity: 1 }],
  tier3: [{ name: 'Componente Arcano', quantity: 1 }],
}

function getEnhancementTier(targetLevel: number): string {
  if (targetLevel <= 4) return 'tier1'
  if (targetLevel <= 8) return 'tier2'
  return 'tier3'
}

export function getEnhancementCost(targetLevel: number) {
  return {
    libras: ENHANCEMENT_COST_LIBRAS[targetLevel] ?? 0,
    materials: ENHANCEMENT_MATERIALS[getEnhancementTier(targetLevel)],
  }
}

const STAT_MAP: Record<string, string> = {
  ataque: 'ataque', magia: 'magia', defesa: 'defesa',
  vitalidade: 'vitalidade', velocidade: 'velocidade',
  precisao: 'precisao', tenacidade: 'tenacidade',
  capitania: 'capitania', eter_max: 'eter_max',
}

/**
 * Retorna todos os equipamentos atualmente equipados por um personagem.
 */
export async function getEquippedItems(characterId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('character_equipment')
    .select('*, items(id, name, description, rarity, stats, slot_type, required_level)')
    .eq('character_id', characterId)
  return data ?? []
}

/**
 * Equipa um item em um slot.
 */
export async function equipItem(
  characterId: string,
  userId: string,
  inventoryId: string,
  slotKey: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id, level')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: slotDef } = await supabase
    .from('equipment_slots_definition')
    .select('slot_key, is_locked')
    .eq('slot_key', slotKey)
    .single()
  if (!slotDef) return { success: false, error: 'Slot inválido.' }
  if (slotDef.is_locked) return { success: false, error: 'Este slot está bloqueado.' }

  const { data: invEntry } = await supabase
    .from('inventory')
    .select('id, item_id, quantity, items(id, name, stats, slot_type, required_level)')
    .eq('id', inventoryId)
    .eq('character_id', characterId)
    .single()
  if (!invEntry) return { success: false, error: 'Item não encontrado no inventário.' }

  const item = invEntry.items as Record<string, unknown> | null
  if (!item) return { success: false, error: 'Item inválido.' }

  // Verifica compatibilidade de slot
  const itemSlotType = item.slot_type as string
  if (itemSlotType !== slotKey) {
    const isAccessoryItem = itemSlotType?.startsWith('acessorio')
    const isAccessorySlot = slotKey.startsWith('acessorio')
    if (!(isAccessoryItem && isAccessorySlot)) {
      return { success: false, error: 'Item incompatível com este slot.' }
    }
  }

  const requiredLevel = (item.required_level as number) ?? 1
  if (character.level < requiredLevel) {
    return { success: false, error: `Nível ${requiredLevel} necessário.` }
  }

  // Enhancement do item
  const { data: enhancement } = await supabase
    .from('item_enhancements')
    .select('enhancement')
    .eq('inventory_id', inventoryId)
    .maybeSingle()
  const currentEnhancement = enhancement?.enhancement ?? 0

  // Desequipa item atual do slot se houver
  const { data: currentEquipped } = await supabase
    .from('character_equipment')
    .select('*, items(stats)')
    .eq('character_id', characterId)
    .eq('slot_key', slotKey)
    .maybeSingle()

  if (currentEquipped) {
    const currentStats = ((currentEquipped.items as Record<string, unknown> | null)?.stats ?? {}) as Record<string, number>
    await applyStatsDelta(supabase, characterId, currentStats, currentEquipped.enhancement ?? 0, 'remove')
    await supabase
      .from('character_equipment')
      .delete()
      .eq('character_id', characterId)
      .eq('slot_key', slotKey)
  }

  // Equipa o novo item
  await supabase.from('character_equipment').insert({
    character_id: characterId,
    slot_key: slotKey,
    item_id: invEntry.item_id,
    enhancement: currentEnhancement,
  })

  const newStats = (item.stats as Record<string, number>) ?? {}
  await applyStatsDelta(supabase, characterId, newStats, currentEnhancement, 'add')

  return { success: true }
}

/**
 * Desequipa um item de um slot.
 */
export async function unequipItem(
  characterId: string,
  userId: string,
  slotKey: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: equipped } = await supabase
    .from('character_equipment')
    .select('*, items(stats)')
    .eq('character_id', characterId)
    .eq('slot_key', slotKey)
    .single()
  if (!equipped) return { success: false, error: 'Nenhum item equipado neste slot.' }

  const stats = ((equipped.items as Record<string, unknown> | null)?.stats ?? {}) as Record<string, number>
  await applyStatsDelta(supabase, characterId, stats, equipped.enhancement ?? 0, 'remove')

  await supabase
    .from('character_equipment')
    .delete()
    .eq('character_id', characterId)
    .eq('slot_key', slotKey)

  return { success: true }
}

/**
 * Melhora um item de +N para +(N+1).
 * Sem chance de falha — custo fixo em Libras + material.
 */
export async function enhanceItem(
  characterId: string,
  userId: string,
  inventoryId: string
): Promise<{ success: boolean; error?: string; newEnhancement?: number }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: enhRecord } = await supabase
    .from('item_enhancements')
    .select('*')
    .eq('inventory_id', inventoryId)
    .maybeSingle()

  const currentLevel = enhRecord?.enhancement ?? 0
  const targetLevel = currentLevel + 1

  if (targetLevel > 12) return { success: false, error: 'Melhoria máxima (+12) já atingida.' }

  const { data: invEntry } = await supabase
    .from('inventory')
    .select('id, item_id, items(stats)')
    .eq('id', inventoryId)
    .eq('character_id', characterId)
    .single()
  if (!invEntry) return { success: false, error: 'Item não encontrado.' }

  // Verifica Libras
  const cost = ENHANCEMENT_COST_LIBRAS[targetLevel]
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('libras')
    .eq('character_id', characterId)
    .single()
  if (!wallet || wallet.libras < cost) {
    return { success: false, error: `Libras insuficientes. Necessário: ${cost.toLocaleString('pt-BR')}.` }
  }

  // Verifica e consome materiais catalíticos
  const tier = getEnhancementTier(targetLevel)
  const requiredMaterials = ENHANCEMENT_MATERIALS[tier]

  for (const mat of requiredMaterials) {
    const { data: matEntries } = await supabase
      .from('inventory')
      .select('id, quantity, items!inner(name)')
      .eq('character_id', characterId)

    const matEntry = (matEntries ?? []).find(
      (e) => (e.items as Record<string, unknown>)?.name === mat.name
    )

    if (!matEntry || matEntry.quantity < mat.quantity) {
      return { success: false, error: `Material insuficiente: ${mat.name} (necessário: ${mat.quantity}).` }
    }

    if (matEntry.quantity === mat.quantity) {
      await supabase.from('inventory').delete().eq('id', matEntry.id)
    } else {
      await supabase
        .from('inventory')
        .update({ quantity: matEntry.quantity - mat.quantity })
        .eq('id', matEntry.id)
    }
  }

  // Debita Libras
  await supabase
    .from('character_wallet')
    .update({ libras: wallet.libras - cost })
    .eq('character_id', characterId)

  // Atualiza enhancement
  if (enhRecord) {
    await supabase
      .from('item_enhancements')
      .update({ enhancement: targetLevel })
      .eq('id', enhRecord.id)
  } else {
    await supabase.from('item_enhancements').insert({
      character_id: characterId,
      item_id: invEntry.item_id,
      inventory_id: inventoryId,
      enhancement: targetLevel,
    })
  }

  // Se item está equipado, atualiza bônus
  const { data: equipped } = await supabase
    .from('character_equipment')
    .select('slot_key')
    .eq('character_id', characterId)
    .eq('item_id', invEntry.item_id)
    .maybeSingle()

  if (equipped) {
    await supabase
      .from('character_equipment')
      .update({ enhancement: targetLevel })
      .eq('character_id', characterId)
      .eq('slot_key', equipped.slot_key)

    // Aplica incremento de 1 nível de enhancement
    const itemStats = ((invEntry.items as Record<string, unknown> | null)?.stats ?? {}) as Record<string, number>
    // Remove old, add new
    await applyStatsDelta(supabase, characterId, itemStats, currentLevel, 'remove')
    await applyStatsDelta(supabase, characterId, itemStats, targetLevel, 'add')
  }

  return { success: true, newEnhancement: targetLevel }
}

// ---------------------------------------------------------------------------
// Helper — aplica ou remove bônus de stats
// Enhancement: +5% por nível acima de 0
// ---------------------------------------------------------------------------

async function applyStatsDelta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
  itemStats: Record<string, number>,
  enhancementLevel: number,
  operation: 'add' | 'remove'
): Promise<void> {
  if (Object.keys(itemStats).length === 0) return

  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('*')
    .eq('character_id', characterId)
    .single()
  if (!attrs) return

  const enhancementFactor = 1 + (enhancementLevel * 0.05)
  const multiplier = operation === 'add' ? 1 : -1

  const updates: Record<string, number> = {}

  for (const [statKey, baseValue] of Object.entries(itemStats)) {
    const attrKey = STAT_MAP[statKey]
    if (!attrKey) continue
    const scaledValue = Math.floor(baseValue * enhancementFactor)
    updates[attrKey] = (attrs[attrKey as keyof typeof attrs] as number) + (scaledValue * multiplier)
  }

  if (updates.vitalidade !== undefined) {
    updates.hp_max = calcHpMax(updates.vitalidade)
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('character_attributes')
      .update(updates as never)
      .eq('character_id', characterId)
  }
}

// ---------------------------------------------------------------------------
// Loja NPC Diária — Mercado Volátil
// Referência: GDD_Sistemas §5.1 Task 6
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'

export async function getDailyShopOffer(characterId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('daily_npc_shop')
    .select('*, npc_shop_items(*)')
    .eq('character_id', characterId)
    .eq('shop_date', today)
    .maybeSingle()

  if (existing) {
    const si = existing.npc_shop_items as Record<string, unknown>
    return {
      offerId: existing.id,
      item: mapShopItem(si),
      purchased: existing.purchased,
      shopDate: existing.shop_date,
    }
  }

  const { data: items } = await supabase
    .from('npc_shop_items')
    .select('*')
    .eq('is_active', true)
  if (!items || items.length === 0) return null

  const randomItem = items[Math.floor(Math.random() * items.length)]

  const { data: offer } = await supabase
    .from('daily_npc_shop')
    .insert({ character_id: characterId, shop_date: today, item_id: randomItem.id })
    .select('*, npc_shop_items(*)')
    .single()

  if (!offer) return null
  const si = offer.npc_shop_items as Record<string, unknown>
  return { offerId: offer.id, item: mapShopItem(si), purchased: false, shopDate: today }
}

function mapShopItem(si: Record<string, unknown>) {
  return {
    id: si.id as string,
    name: si.name as string,
    description: si.description as string,
    rewardType: si.reward_type as string,
    rewardAmount: si.reward_amount as number | null,
    priceLibras: si.price_libras as number,
    priceGemas: si.price_gemas as number,
    rarity: si.rarity as string,
  }
}

export async function purchaseDailyOffer(
  characterId: string,
  userId: string,
  offerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const today = new Date().toISOString().split('T')[0]
  const { data: offer } = await supabase
    .from('daily_npc_shop')
    .select('*, npc_shop_items(*)')
    .eq('id', offerId).eq('character_id', characterId).eq('shop_date', today).single()
  if (!offer) return { success: false, error: 'Oferta não encontrada ou expirada.' }
  if (offer.purchased) return { success: false, error: 'Item já comprado hoje.' }

  const si = offer.npc_shop_items as Record<string, unknown>
  const priceLibras = si.price_libras as number
  const priceGemas = si.price_gemas as number

  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('libras, essencia, premium_currency, summon_tickets')
    .eq('character_id', characterId).single()
  if (!wallet) return { success: false, error: 'Carteira não encontrada.' }

  const wu: Record<string, number> = {}
  if (priceLibras > 0) {
    if (wallet.libras < priceLibras) return { success: false, error: `Libras insuficientes. Necessário: ${priceLibras}.` }
    wu.libras = wallet.libras - priceLibras
  }
  if (priceGemas > 0) {
    if (wallet.premium_currency < priceGemas) return { success: false, error: `Gemas insuficientes. Necessário: ${priceGemas}.` }
    wu.premium_currency = wallet.premium_currency - priceGemas
  }

  const rewardType = si.reward_type as string
  const rewardAmount = (si.reward_amount as number) ?? 0

  switch (rewardType) {
    case 'libras': wu.libras = (wu.libras ?? wallet.libras) + rewardAmount; break
    case 'essencia': wu.essencia = wallet.essencia + rewardAmount; break
    case 'ticket': wu.summon_tickets = wallet.summon_tickets + rewardAmount; break
    case 'xp': { const { grantXp } = await import('./levelup'); await grantXp(characterId, rewardAmount); break }
    case 'item': {
      const itemId = si.item_id as string | null
      if (itemId) {
        const { data: inv } = await supabase.from('inventory').select('id, quantity').eq('character_id', characterId).eq('item_id', itemId).maybeSingle()
        if (inv) { await supabase.from('inventory').update({ quantity: inv.quantity + 1 }).eq('id', inv.id) }
        else { await supabase.from('inventory').insert({ character_id: characterId, item_id: itemId, quantity: 1 }) }
      }
      break
    }
  }

  if (Object.keys(wu).length > 0) {
    await supabase.from('character_wallet').update(wu as never).eq('character_id', characterId)
  }

  await supabase.from('daily_npc_shop').update({ purchased: true, purchased_at: new Date().toISOString() }).eq('id', offerId)

  await createEvent(supabase, {
    type: 'daily_task_completed',
    actorId: characterId,
    metadata: { task_type: 'mercado_volatil', item: si.name },
    isPublic: false,
    narrativeText: `Item adquirido da Loja do Viajante: ${si.name as string}.`,
  })

  return { success: true }
}

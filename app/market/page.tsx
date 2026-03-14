import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MarketTabs from '@/components/market/MarketTabs'

export default async function MarketPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!character) redirect('/character/create')

  const characterId = character.id

  const [
    { data: listings },
    { data: auctions },
    { data: recipes },
    { data: inventory },
  ] = await Promise.all([
    supabase
      .from('market_listings')
      .select('*, items(name, description, item_type, rarity)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('auction_listings')
      .select('*, items(name, description, item_type, rarity)')
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true })
      .limit(20),
    supabase
      .from('crafting_recipes')
      .select('*, items!result_item_id(name, rarity)')
      .eq('is_active', true),
    supabase
      .from('inventory')
      .select('*, items(name, description, item_type, rarity, is_tradeable)')
      .eq('character_id', characterId)
      .order('updated_at', { ascending: false }),
  ])

  // Fetch seller names separately to avoid Supabase alias issues
  const sellerIds = [
    ...(listings ?? []).map((l) => l.seller_id),
    ...(auctions ?? []).map((a) => a.seller_id),
  ].filter((id, i, arr) => arr.indexOf(id) === i)

  let sellerNames: Record<string, string> = {}
  if (sellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from('characters')
      .select('id, name')
      .in('id', sellerIds)
    if (sellers) {
      sellerNames = Object.fromEntries(sellers.map((s) => [s.id, s.name]))
    }
  }

  return (
    <div className="min-h-screen bg-[var(--ark-bg)] p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Mercado de Arkandia
        </h1>

        <MarketTabs
          characterId={characterId}
          characterLevel={character.level}
          listings={(listings ?? []).map((l) => ({
            id: l.id,
            sellerId: l.seller_id,
            sellerName: sellerNames[l.seller_id] ?? 'Desconhecido',
            itemId: l.item_id,
            itemName: (l.items as Record<string, unknown>)?.name as string ?? 'Item',
            itemRarity: (l.items as Record<string, unknown>)?.rarity as string ?? 'comum',
            itemType: (l.items as Record<string, unknown>)?.item_type as string ?? 'material',
            quantity: l.quantity,
            priceLibras: l.price_libras,
          }))}
          auctions={(auctions ?? []).map((a) => ({
            id: a.id,
            sellerId: a.seller_id,
            sellerName: sellerNames[a.seller_id] ?? 'Desconhecido',
            itemId: a.item_id,
            itemName: (a.items as Record<string, unknown>)?.name as string ?? 'Item',
            itemRarity: (a.items as Record<string, unknown>)?.rarity as string ?? 'comum',
            quantity: a.quantity,
            startingPrice: a.starting_price,
            currentBid: a.current_bid,
            currentBidder: a.current_bidder,
            endsAt: a.ends_at,
          }))}
          recipes={(recipes ?? []).map((r) => ({
            id: r.id,
            name: r.name,
            resultItemName: (r.items as Record<string, unknown>)?.name as string ?? 'Item',
            resultItemRarity: (r.items as Record<string, unknown>)?.rarity as string ?? 'comum',
            resultQuantity: r.result_quantity ?? 1,
            ingredients: r.ingredients as Array<{ item_id: string; quantity: number }>,
            requiredLevel: r.required_level ?? 1,
          }))}
          inventory={(inventory ?? []).map((inv) => ({
            id: inv.id,
            itemId: inv.item_id,
            itemName: (inv.items as Record<string, unknown>)?.name as string ?? 'Item',
            itemDescription: (inv.items as Record<string, unknown>)?.description as string ?? '',
            itemType: (inv.items as Record<string, unknown>)?.item_type as string ?? 'material',
            itemRarity: (inv.items as Record<string, unknown>)?.rarity as string ?? 'comum',
            isTradeable: (inv.items as Record<string, unknown>)?.is_tradeable as boolean ?? false,
            quantity: inv.quantity,
          }))}
        />
      </div>
    </div>
  )
}

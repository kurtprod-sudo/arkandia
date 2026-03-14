import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SummonPanel from '@/components/summon/SummonPanel'

export default async function SummonPage() {
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

  // Busca catálogos ativos com itens
  const { data: catalogs } = await supabase
    .from('summon_catalogs')
    .select('*, summon_catalog_items(*, items(name, rarity))')
    .eq('is_active', true)

  // Busca pity do personagem por catálogo
  const { data: pityData } = await supabase
    .from('summon_pity')
    .select('catalog_id, pulls_since_rare, total_pulls')
    .eq('character_id', characterId)

  // Busca wallet (gemas e tickets)
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('premium_currency, summon_tickets')
    .eq('character_id', characterId)
    .single()

  // Histórico recente
  const { data: history } = await supabase
    .from('summon_history')
    .select('*, items(name, rarity)')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Mapeia catálogos com probabilidades
  const catalogViews = (catalogs ?? []).map((c) => {
    const items = (c.summon_catalog_items as Array<Record<string, unknown>>) ?? []
    const totalWeight = items.reduce((sum, i) => sum + ((i.weight as number) ?? 0), 0)
    const pity = (pityData ?? []).find((p) => p.catalog_id === c.id)

    return {
      id: c.id,
      name: c.name,
      description: c.description,
      costGemas: c.cost_gemas,
      costTickets: c.cost_tickets,
      pityThreshold: c.pity_threshold,
      pullsSinceRare: pity?.pulls_since_rare ?? 0,
      totalPulls: pity?.total_pulls ?? 0,
      items: items.map((i) => {
        const itemData = i.items as Record<string, unknown> | null
        return {
          id: i.id as string,
          itemName: (itemData?.name as string) ?? 'Item',
          itemRarity: (itemData?.rarity as string) ?? 'comum',
          quantity: (i.quantity as number) ?? 1,
          weight: (i.weight as number) ?? 0,
          probability: totalWeight > 0
            ? parseFloat((((i.weight as number) / totalWeight) * 100).toFixed(2))
            : 0,
          isPityEligible: (i.is_pity_eligible as boolean) ?? true,
        }
      }),
    }
  })

  const historyViews = (history ?? []).map((h) => ({
    id: h.id,
    itemName: (h.items as Record<string, unknown>)?.name as string ?? 'Item',
    itemRarity: (h.items as Record<string, unknown>)?.rarity as string ?? 'comum',
    quantity: h.quantity,
    costType: h.cost_type,
    wasPity: h.was_pity ?? false,
    createdAt: h.created_at ?? '',
  }))

  return (
    <div className="min-h-screen bg-[var(--ark-bg)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Invocação Arcana
        </h1>

        <SummonPanel
          characterId={characterId}
          gemas={wallet?.premium_currency ?? 0}
          tickets={wallet?.summon_tickets ?? 0}
          catalogs={catalogViews}
          history={historyViews}
        />
      </div>
    </div>
  )
}

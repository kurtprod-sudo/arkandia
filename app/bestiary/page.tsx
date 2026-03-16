import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCharacterBestiary, getZoneBestiaryProgress } from '@/lib/game/bestiary'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import BestiaryCard from './BestiaryCard'

const TIER_COLORS: Record<string, 'bronze' | 'alive' | 'injured' | 'gold'> = {
  fraco: 'bronze', medio: 'alive', forte: 'injured', elite: 'gold',
}

export default async function BestiaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters').select('id, name').eq('user_id', user.id).single()
  if (!character) redirect('/character/create')

  const [entries, zoneProgress] = await Promise.all([
    getCharacterBestiary(character.id),
    getZoneBestiaryProgress(character.id),
  ])

  const totalDiscovered = entries.length
  const totalNpcs = zoneProgress.reduce((s, z) => s + z.total, 0)
  const overallPct = totalNpcs > 0 ? Math.round((totalDiscovered / totalNpcs) * 100) : 0

  // Group entries by zone
  const byZone = new Map<string, typeof entries>()
  for (const e of entries) {
    const arr = byZone.get(e.zoneId) ?? []
    arr.push(e)
    byZone.set(e.zoneId, arr)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Bestiário
        </h1>
        <span className="text-xs font-data text-[var(--text-label)]">
          {totalDiscovered} criaturas registradas
        </span>
      </div>

      {/* Overall progress */}
      <div className="h-2 bg-[var(--ark-bg)] rounded-full overflow-hidden">
        <div className="h-full bg-[var(--ark-gold-bright)] rounded-full transition-all" style={{ width: `${overallPct}%` }} />
      </div>
      <ArkDivider variant="dark" />

      {/* Zones */}
      {zoneProgress.map((zone) => {
        const zoneEntries = byZone.get(zone.zoneId) ?? []
        const zonePct = zone.total > 0 ? Math.round((zone.discovered / zone.total) * 100) : 0

        return (
          <div key={zone.zoneId} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-display font-bold text-[var(--text-primary)]">{zone.zoneName}</h2>
                {zone.completed && (
                  <ArkBadge color="gold" className="text-[7px]">ZONA COMPLETA</ArkBadge>
                )}
              </div>
              <span className="text-[10px] font-data text-[var(--text-label)]">
                {zone.discovered}/{zone.total}
              </span>
            </div>

            <div className="h-1 bg-[var(--ark-bg)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--ark-amber)] rounded-full transition-all" style={{ width: `${zonePct}%` }} />
            </div>

            {zoneEntries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {zoneEntries.map((entry) => (
                  <BestiaryCard
                    key={entry.npcTypeId}
                    entry={{
                      npcName: entry.npcName,
                      npcTier: entry.npcTier,
                      totalDefeated: entry.totalDefeated,
                      firstDefeatedAt: entry.firstDefeatedAt,
                      loreText: entry.loreText,
                      firstDiscovererName: entry.firstDiscovererName,
                      knownDrops: entry.knownDrops,
                      isOwnDiscovery: entry.firstDiscovererName === character.name,
                    }}
                    tierColor={TIER_COLORS[entry.npcTier] ?? 'bronze'}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs font-body text-[var(--text-ghost)] italic">Nenhuma criatura desta zona registrada.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

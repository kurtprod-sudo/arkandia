import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBattlePassStatus, getFreeReward, getPremiumReward } from '@/lib/game/battle_pass'
import { getSeasonHistory } from '@/lib/game/season'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import BattlePassTrack from './BattlePassTrack'
import SeasonCountdown from './SeasonCountdown'

export default async function BattlePassPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) redirect('/character/create')

  const [status, history] = await Promise.all([
    getBattlePassStatus(character.id),
    getSeasonHistory(5),
  ])

  if (!status) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Passe de Temporada</h1>
        <p className="text-xs font-body text-[var(--text-label)] italic">Nenhuma temporada ativa no momento.</p>
      </div>
    )
  }

  // Build tier data for the track
  const tiers = Array.from({ length: 40 }, (_, i) => {
    const tier = i + 1
    const freeReward = getFreeReward(tier)
    const premiumReward = getPremiumReward(tier)
    const freeClaimed = status.claimedTiers.some((c) => c.tier === tier && c.track === 'free')
    const premiumClaimed = status.claimedTiers.some((c) => c.tier === tier && c.track === 'premium')
    return { tier, freeReward, premiumReward, freeClaimed, premiumClaimed }
  })

  const xpInTier = status.seasonXp - status.currentTier * 100
  const xpTierMax = 100

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Passe de Temporada
        </h1>
        <SeasonCountdown endsAt={status.seasonEndsAt} />
      </div>
      <ArkDivider variant="dark" />

      {/* Header */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <p className="text-lg font-display font-bold text-[var(--text-primary)]">{status.seasonName}</p>
        <p className="text-xs font-body text-[var(--text-secondary)] mt-0.5">{status.seasonTheme}</p>
        <div className="flex items-center gap-4 mt-3">
          <div>
            <p className="text-[10px] font-data text-[var(--text-label)] uppercase">Tier</p>
            <p className="text-xl font-display font-bold text-[var(--text-primary)]">{status.currentTier}</p>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-[10px] font-data text-[var(--text-label)] mb-0.5">
              <span>{xpInTier} / {xpTierMax} XP</span>
              <span>Total: {status.seasonXp}</span>
            </div>
            <div className="h-2 bg-[var(--ark-bg)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--ark-amber)] rounded-full transition-all" style={{ width: `${Math.min(100, (xpInTier / xpTierMax) * 100)}%` }} />
            </div>
          </div>
          <div>
            {status.isPremium ? (
              <ArkBadge color="gold" className="text-[9px]">PREMIUM</ArkBadge>
            ) : (
              <form action={async () => { 'use server'; const { purchasePremiumAction } = await import('@/app/actions/battle_pass'); await purchasePremiumAction() }}>
                <button type="submit" className="px-3 py-1.5 text-[10px] font-data font-semibold uppercase tracking-wider text-[var(--ark-gold-bright)] border border-[var(--ark-gold)]/40 rounded-sm hover:bg-[var(--ark-gold)]/10 transition-colors">
                  Premium — 500G
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Track */}
      <BattlePassTrack
        tiers={tiers}
        currentTier={status.currentTier}
        isPremium={status.isPremium}
      />

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
          <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Temporadas Anteriores</h2>
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.season.id} className="p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                <p className="text-xs font-data font-semibold text-[var(--text-primary)]">{h.season.name}</p>
                <p className="text-[10px] font-data text-[var(--text-ghost)]">{h.season.theme}</p>
                {h.snapshots.slice(0, 9).map((s, i) => (
                  <div key={`${s.category}-${i}`} className="flex items-center justify-between text-[10px] mt-1">
                    <span className="font-data text-[var(--text-label)]">#{s.rankPosition} {s.entityName}</span>
                    <span className="font-data text-[var(--text-ghost)]">{s.category} · {s.score}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'

interface TierReward { libras: number; essencias: number; gemas: number; tickets: number }
interface TierData {
  tier: number; freeReward: TierReward; premiumReward: TierReward
  freeClaimed: boolean; premiumClaimed: boolean
}

function hasReward(r: TierReward): boolean {
  return r.libras > 0 || r.essencias > 0 || r.gemas > 0 || r.tickets > 0
}

function rewardLabel(r: TierReward): string {
  const parts: string[] = []
  if (r.libras > 0) parts.push(`${r.libras}£`)
  if (r.essencias > 0) parts.push(`${r.essencias}E`)
  if (r.gemas > 0) parts.push(`${r.gemas}G`)
  if (r.tickets > 0) parts.push(`${r.tickets}T`)
  return parts.join(' ')
}

export default function BattlePassTrack({ tiers, currentTier, isPremium }: {
  tiers: TierData[]; currentTier: number; isPremium: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleClaim = async (tier: number, track: 'free' | 'premium') => {
    setLoading(`${tier}-${track}`)
    const { claimTierRewardAction } = await import('@/app/actions/battle_pass')
    await claimTierRewardAction(tier, track)
    router.refresh()
    setLoading(null)
  }

  const isMilestone = (t: number) => t === 10 || t === 20 || t === 30 || t === 40

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-2 min-w-max">
        {tiers.map((t) => {
          const locked = t.tier > currentTier
          const milestone = isMilestone(t.tier)
          const freeAvailable = !locked && !t.freeClaimed
          const premAvailable = isPremium && !locked && !t.premiumClaimed && hasReward(t.premiumReward)

          return (
            <div
              key={t.tier}
              className={`flex flex-col items-center ${milestone ? 'w-20' : 'w-16'} ${locked ? 'opacity-40' : ''}`}
            >
              {/* Premium reward */}
              {hasReward(t.premiumReward) && (
                <div className="text-center mb-1">
                  <p className="text-[7px] font-data text-[var(--ark-gold-bright)]">{rewardLabel(t.premiumReward)}</p>
                  {t.premiumClaimed && <span className="text-[8px] text-[var(--ark-gold-bright)]">✓</span>}
                  {premAvailable && (
                    <button
                      onClick={() => handleClaim(t.tier, 'premium')}
                      disabled={!!loading}
                      className="text-[7px] font-data text-[var(--ark-gold-bright)] border border-[var(--ark-gold)]/40 rounded px-1 hover:bg-[var(--ark-gold)]/10"
                    >
                      {loading === `${t.tier}-premium` ? '...' : 'P'}
                    </button>
                  )}
                </div>
              )}

              {/* Tier node */}
              <div className={`${milestone ? 'w-12 h-12' : 'w-9 h-9'} rounded-sm border flex items-center justify-center text-xs font-data font-bold ${
                locked ? 'border-[var(--ark-border)] text-[var(--text-ghost)]' :
                milestone ? 'border-[var(--ark-gold)]/60 bg-[var(--ark-gold)]/10 text-[var(--ark-gold-bright)]' :
                'border-[var(--ark-border-bright)] text-[var(--text-primary)]'
              }`}>
                {t.tier}
              </div>

              {/* Free reward */}
              <div className="text-center mt-1">
                <p className="text-[7px] font-data text-[var(--text-label)]">{rewardLabel(t.freeReward)}</p>
                {t.freeClaimed && <span className="text-[8px] text-status-alive">✓</span>}
                {freeAvailable && (
                  <button
                    onClick={() => handleClaim(t.tier, 'free')}
                    disabled={!!loading}
                    className="text-[7px] font-data text-[var(--text-secondary)] border border-[var(--ark-border)] rounded px-1 hover:bg-[var(--ark-surface)]"
                  >
                    {loading === `${t.tier}-free` ? '...' : '↓'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { claimWeeklyRewardAction } from '@/app/actions/weekly'
import { isBeforeThursday } from '@/lib/game/weekly'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import WeeklyCountdown from './WeeklyCountdown'
import type { WeeklyMissionsRecord } from '@/lib/game/weekly'

const DIFF_COLORS: Record<string, { badge: 'bronze' | 'alive' | 'crimson'; bar: string }> = {
  facil:   { badge: 'bronze',  bar: 'var(--text-secondary)' },
  medio:   { badge: 'alive',   bar: '#4A90D9' },
  dificil: { badge: 'crimson', bar: 'var(--ark-red-glow)' },
}
const DIFF_LABELS: Record<string, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }

interface Props {
  weeklyMissions: WeeklyMissionsRecord
}

export default function WeeklyMissionsWidget({ weeklyMissions }: Props) {
  const { missions, completedCount, weekStart, earlyBonusClaimed } = weeklyMissions
  const showEarlyBonus = !earlyBonusClaimed && isBeforeThursday(weekStart)

  // Next Monday
  const ws = new Date(weekStart + 'T00:00:00Z')
  const nextReset = new Date(ws.getTime() + 7 * 86400000).toISOString()

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">
          Missões Semanais
        </h3>
        <span className="text-xs font-data text-[var(--text-primary)]">{completedCount}/5</span>
      </div>

      {showEarlyBonus && (
        <div className="mb-3 p-2 rounded-sm border border-[var(--ark-gold)]/30 bg-[var(--ark-gold)]/5">
          <p className="text-[10px] font-data text-[var(--ark-gold-bright)] text-center tracking-wider">
            Complete antes de quinta: +20 Essências
          </p>
        </div>
      )}

      <div className="space-y-2 mb-3">
        {missions.map((m, i) => {
          const diff = DIFF_COLORS[m.difficulty] ?? DIFF_COLORS.facil
          const pct = m.target > 0 ? Math.min(100, (m.progress / m.target) * 100) : 0

          return (
            <div key={`${m.type}-${i}`} className="p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-data font-semibold text-[var(--text-primary)]">{m.label}</span>
                  <ArkBadge color={diff.badge} className="text-[7px]">{DIFF_LABELS[m.difficulty]}</ArkBadge>
                </div>
                {m.reward_claimed && (
                  <span className="text-[9px] font-data text-[var(--ark-gold-bright)]">
                    +{m.xp_reward}XP +{m.essencias_reward}Ess +{m.libras_reward}£
                  </span>
                )}
              </div>
              <p className="text-[10px] font-body text-[var(--text-label)] mb-1">{m.description}</p>

              <div className="h-1.5 bg-[var(--ark-surface)] rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: diff.bar }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-data text-[var(--text-ghost)]">{m.progress}/{m.target}</span>
                {m.completed && !m.reward_claimed && (
                  <form action={async () => { 'use server'; await claimWeeklyRewardAction(i) }}>
                    <ArkButton type="submit" size="sm">Resgatar</ArkButton>
                  </form>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center">
        <span className="text-[10px] font-data text-[var(--text-ghost)]">Renova em </span>
        <WeeklyCountdown nextReset={nextReset} />
      </div>
    </div>
  )
}

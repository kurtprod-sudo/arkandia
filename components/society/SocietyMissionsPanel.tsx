'use client'

import { useState } from 'react'
import ArkBadge from '@/components/ui/ArkBadge'

type Difficulty = 'facil' | 'medio' | 'dificil'

interface Mission {
  index: number; label: string; description: string
  target: number; progress: number; difficulty: Difficulty
  completed: boolean; is_bonus: boolean
  treasury_reward: number; xp_reward: number
  top3Contributors?: Array<{ characterName: string; count: number }>
}

interface Props {
  missions: Mission[] | null
  weekStart: string
  bonusUnlocked: boolean
  history: {
    records: Array<{ weekStart: string; missions: Array<{ completed: boolean; is_bonus: boolean }> }>
    streak: number; bestWeek: number; totalCompleted: number
  }
}

const DIFF_COLORS: Record<Difficulty, 'bronze' | 'alive' | 'injured'> = {
  facil: 'bronze', medio: 'alive', dificil: 'injured',
}
const DIFF_LABELS: Record<Difficulty, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }

export default function SocietyMissionsPanel({ missions, weekStart, bonusUnlocked, history }: Props) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Missões da Semana</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-data text-[var(--text-ghost)]">Semana de {weekStart}</span>
          {bonusUnlocked && <ArkBadge color="gold" className="text-[7px]">BÔNUS</ArkBadge>}
        </div>
      </div>

      {missions && missions.length > 0 ? (
        <div className="space-y-3">
          {missions.map((m) => {
            const pct = m.target > 0 ? Math.min(100, (m.progress / m.target) * 100) : 0
            const barColor = m.completed ? '#2D7A3A' : pct >= 50 ? '#C8B560' : 'var(--ark-red-glow)'

            return (
              <div key={m.index} className={`p-3 bg-[var(--ark-bg)] border rounded-sm ${m.is_bonus ? 'border-[var(--ark-gold)]/40' : 'border-[var(--ark-border)]'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-data font-semibold text-[var(--text-primary)]">{m.label}</span>
                    <ArkBadge color={DIFF_COLORS[m.difficulty]} className="text-[7px]">{DIFF_LABELS[m.difficulty]}</ArkBadge>
                    {m.is_bonus && <ArkBadge color="gold" className="text-[7px]">BÔNUS</ArkBadge>}
                  </div>
                  {m.completed && <span className="text-[10px] font-data text-status-alive">✓ Concluída</span>}
                </div>
                <p className="text-[10px] font-body text-[var(--text-label)] mb-1">{m.description}</p>

                <div className="h-1.5 bg-[var(--ark-surface)] rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <div className="flex items-center justify-between text-[9px] font-data text-[var(--text-ghost)]">
                  <span>{m.progress} / {m.target}</span>
                  <span>Cofre +{m.treasury_reward.toLocaleString()}£ · XP +{m.xp_reward}</span>
                </div>

                {m.top3Contributors && m.top3Contributors.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {m.top3Contributors.map((c, i) => (
                      <p key={c.characterName} className="text-[9px] font-data text-[var(--text-label)]">
                        {i + 1}. {c.characterName} — {c.count}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs font-body text-[var(--text-label)] italic">Nenhuma missão ativa.</p>
      )}

      {/* History accordion */}
      <button onClick={() => setShowHistory(!showHistory)} className="mt-4 text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider hover:text-[var(--text-secondary)]">
        {showHistory ? '▾ Ocultar Recordes' : '▸ Recordes da Guilda'}
      </button>
      {showHistory && (
        <div className="mt-2 p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm text-xs font-data space-y-1">
          <p className="text-[var(--text-secondary)]">Streak: <span className="text-[var(--text-primary)]">{history.streak} semanas</span> com 3/3</p>
          <p className="text-[var(--text-secondary)]">Melhor semana: <span className="text-[var(--text-primary)]">{history.bestWeek}/3</span></p>
          <p className="text-[var(--text-secondary)]">Total acumulado: <span className="text-[var(--text-primary)]">{history.totalCompleted}</span></p>
          {history.records.map((r) => {
            const baseComplete = r.missions.filter((m) => !m.is_bonus && m.completed).length
            return (
              <p key={r.weekStart} className="text-[var(--text-ghost)]">
                {r.weekStart}: {baseComplete >= 3 ? '✓' : '○'} {baseComplete}/3
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}

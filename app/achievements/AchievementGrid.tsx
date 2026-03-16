'use client'

import { useState } from 'react'
import ArkBadge from '@/components/ui/ArkBadge'
import { Trophy, Check } from 'lucide-react'

const CATEGORIES = [
  { key: '', label: 'Todas' },
  { key: 'progressao', label: 'Progressão' },
  { key: 'combate', label: 'Combate' },
  { key: 'exploracao', label: 'Exploração' },
  { key: 'social', label: 'Social' },
  { key: 'economia', label: 'Economia' },
  { key: 'marco', label: 'Marcos' },
]

const RARITY_BORDER: Record<string, string> = {
  comum: 'var(--text-secondary)',
  raro: '#4A90D9',
  epico: '#9B59B6',
  lendario: 'var(--ark-gold-bright)',
}

const RARITY_LABELS: Record<string, string> = {
  comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário',
}

const RARITY_REWARD: Record<string, string> = {
  raro: '+5 Essências',
  epico: '+15 Essências',
  lendario: '+1 Ticket de Summon',
}

interface Achievement {
  id: string; key: string; title: string; description: string
  category: string; rarity: string; icon: string
  target: number | null; titleRewardName: string | null
  progress: number; unlockedAt: string | null
}

export default function AchievementGrid({ achievements }: { achievements: Achievement[] }) {
  const [filter, setFilter] = useState('')

  const filtered = filter ? achievements.filter((a) => a.category === filter) : achievements

  return (
    <>
      {/* Filters */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`px-3 py-1.5 text-[10px] font-data uppercase tracking-wider rounded-sm whitespace-nowrap transition-colors ${
              filter === c.key
                ? 'bg-[var(--ark-surface)] text-[var(--text-primary)] border border-[var(--ark-border-bright)]'
                : 'text-[var(--text-label)] hover:text-[var(--text-secondary)] border border-transparent'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((a) => {
          const unlocked = !!a.unlockedAt
          const isLegendary = a.rarity === 'lendario'
          const isHidden = isLegendary && !unlocked
          const borderColor = RARITY_BORDER[a.rarity] ?? RARITY_BORDER.comum
          const reward = RARITY_REWARD[a.rarity]

          return (
            <div
              key={a.id}
              className={`relative rounded-sm p-4 border transition-all ${
                unlocked ? 'bg-[var(--ark-surface)]' : 'bg-[var(--ark-bg)] opacity-50'
              }`}
              style={{ borderTopWidth: '2px', borderTopColor: borderColor, borderColor: 'var(--ark-border)' }}
            >
              {/* Unlock check */}
              {unlocked && (
                <div className="absolute top-2 right-2">
                  <Check size={16} className="text-[var(--ark-gold-bright)]" />
                </div>
              )}

              {/* Icon */}
              <div className="flex justify-center mb-2">
                <Trophy size={28} style={{ color: unlocked ? borderColor : 'var(--text-ghost)' }} />
              </div>

              {/* Title */}
              <p className="text-xs font-display font-bold text-center text-[var(--text-primary)]">
                {isHidden ? '???' : a.title}
              </p>

              {/* Description */}
              <p className="text-[10px] font-body text-center text-[var(--text-secondary)] mt-1">
                {isHidden ? '???' : a.description}
              </p>

              {/* Progress bar */}
              {a.target && !isHidden && (
                <div className="mt-2">
                  <div className="h-1.5 bg-[var(--ark-bg)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-600"
                      style={{
                        width: `${Math.min(100, (a.progress / a.target) * 100)}%`,
                        background: borderColor,
                      }}
                    />
                  </div>
                  <p className="text-[9px] font-data text-[var(--text-label)] text-center mt-0.5">
                    {a.progress} / {a.target}
                  </p>
                </div>
              )}

              {/* Unlock date */}
              {unlocked && a.unlockedAt && (
                <p className="text-[9px] font-data text-[var(--text-ghost)] text-center mt-1">
                  {new Date(a.unlockedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </p>
              )}

              {/* Title reward */}
              {a.titleRewardName && !isHidden && (
                <p className="text-[8px] font-data text-[var(--ark-gold-bright)] text-center mt-1">
                  Concede Título
                </p>
              )}

              {/* Rarity reward */}
              {reward && !isHidden && (
                <p className="text-[8px] font-data text-[var(--text-ghost)] text-center mt-0.5">
                  {reward}
                </p>
              )}

              {/* Rarity badge */}
              <div className="flex justify-center mt-2">
                <span className="text-[7px] font-data uppercase tracking-wider" style={{ color: borderColor }}>
                  {RARITY_LABELS[a.rarity]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

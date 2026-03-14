'use client'

import { useState } from 'react'
import ArkBadge from '@/components/ui/ArkBadge'

// ─── Types ──────────────────────────────────────────────────────

interface RankingEntryView {
  id: string
  entityName: string
  entityType: 'character' | 'society'
  score: number
  rankPosition: number
  metadata: Record<string, unknown>
  updatedAt: string
}

interface RankingsTabsProps {
  guerreiros: RankingEntryView[]
  sociedades: RankingEntryView[]
  exploradores: RankingEntryView[]
  heroisGuerra: RankingEntryView[]
}

// ─── Helpers ────────────────────────────────────────────────────

const TABS = [
  { key: 'guerreiros', label: 'Guerreiros', metric: 'Vitórias' },
  { key: 'sociedades', label: 'Sociedades', metric: 'Territórios' },
  { key: 'exploradores', label: 'Exploradores', metric: 'Expedições' },
  { key: 'heroisGuerra', label: 'Heróis de Guerra', metric: 'Guerras' },
] as const

type TabKey = typeof TABS[number]['key']

const PODIUM_COLORS: Record<number, string> = {
  1: 'text-[var(--ark-gold-bright)] border-[var(--ark-gold)]',
  2: 'text-[#c0c0c0] border-[#808080]',
  3: 'text-[#cd7f32] border-[#8b5a2b]',
}

const PODIUM_BADGES: Record<number, 'gold' | 'bronze' | 'dead'> = {
  1: 'gold',
  2: 'dead',
  3: 'bronze',
}

// ─── Component ──────────────────────────────────────────────────

export default function RankingsTabs({
  guerreiros,
  sociedades,
  exploradores,
  heroisGuerra,
}: RankingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('guerreiros')

  const dataMap: Record<TabKey, RankingEntryView[]> = {
    guerreiros,
    sociedades,
    exploradores,
    heroisGuerra,
  }

  const entries = dataMap[activeTab]
  const currentTab = TABS.find((t) => t.key === activeTab)!

  // Find latest update time
  const latestUpdate = entries.length > 0
    ? entries.reduce((latest, e) => e.updatedAt > latest ? e.updatedAt : latest, entries[0].updatedAt)
    : null

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-4 py-2 text-xs font-data font-semibold tracking-wider uppercase whitespace-nowrap
              transition-all duration-200 rounded-t-sm border-b-2
              ${activeTab === tab.key
                ? 'text-[var(--text-primary)] border-[var(--ark-red)] bg-[var(--ark-bg-raised)]'
                : 'text-[var(--text-label)] border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--ark-border)]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[var(--ark-bg-raised)] border border-[var(--ark-border)] rounded-sm p-4">
        {entries.length === 0 ? (
          <p className="text-sm font-body text-[var(--text-ghost)] italic text-center py-8">
            Nenhum dado ainda — seja o primeiro.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isTop3 = entry.rankPosition <= 3
              const podiumClass = PODIUM_COLORS[entry.rankPosition] ?? ''

              return (
                <div
                  key={entry.id}
                  className={`
                    flex items-center justify-between p-3 rounded-sm
                    ${isTop3
                      ? `bg-[var(--ark-bg)]/80 border ${podiumClass}`
                      : 'bg-[var(--ark-bg)]/40 border border-[var(--ark-border)]/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Position */}
                    <span
                      className={`
                        w-8 text-center font-data font-bold text-lg
                        ${isTop3 ? podiumClass.split(' ')[0] : 'text-[var(--text-ghost)]'}
                      `}
                    >
                      {entry.rankPosition}
                    </span>

                    {/* Name */}
                    <div>
                      <span className={`
                        font-body text-sm
                        ${isTop3 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}
                      `}>
                        {entry.entityName}
                      </span>
                      {entry.entityType === 'society' && (
                        <span className="ml-2 text-[10px] font-data text-[var(--text-ghost)] uppercase">
                          Sociedade
                        </span>
                      )}
                    </div>

                    {/* Top 3 badge */}
                    {isTop3 && (
                      <ArkBadge color={PODIUM_BADGES[entry.rankPosition] ?? 'dead'}>
                        #{entry.rankPosition}
                      </ArkBadge>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className="font-data font-bold text-lg text-[var(--text-primary)] tabular-nums">
                      {entry.score}
                    </span>
                    <span className="ml-1 text-[10px] font-data text-[var(--text-label)] uppercase">
                      {currentTab.metric}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Last update */}
        {latestUpdate && (
          <p className="text-[10px] font-data text-[var(--text-ghost)] text-right mt-3">
            Atualizado em {new Date(latestUpdate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}

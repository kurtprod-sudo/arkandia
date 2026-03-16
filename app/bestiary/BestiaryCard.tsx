'use client'

import { useState } from 'react'
import ArkBadge from '@/components/ui/ArkBadge'

interface Props {
  entry: {
    npcName: string; npcTier: string; totalDefeated: number
    firstDefeatedAt: string; loreText: string | null
    firstDiscovererName: string | null; knownDrops: string[]
    isOwnDiscovery: boolean
  }
  tierColor: 'bronze' | 'alive' | 'injured' | 'gold'
}

const TIER_LABELS: Record<string, string> = { fraco: 'Fraco', medio: 'Médio', forte: 'Forte', elite: 'Elite' }

export default function BestiaryCard({ entry, tierColor }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-display font-bold text-[var(--text-primary)]">{entry.npcName}</span>
          <ArkBadge color={tierColor} className="text-[7px]">{TIER_LABELS[entry.npcTier] ?? entry.npcTier}</ArkBadge>
        </div>
      </div>

      {entry.firstDiscovererName && (
        <p className={`text-[10px] font-data mb-2 ${entry.isOwnDiscovery ? 'text-[var(--ark-gold-bright)]' : 'text-[var(--text-label)]'}`}>
          Descoberto por {entry.firstDiscovererName}
          {entry.isOwnDiscovery && ' (você!)'}
        </p>
      )}

      {/* Lore */}
      {entry.loreText ? (
        <div className="mb-2">
          <p className={`text-xs font-body text-[var(--text-secondary)] italic leading-relaxed ${expanded ? '' : 'line-clamp-4'}`}>
            {entry.loreText}
          </p>
          {entry.loreText.length > 200 && (
            <button onClick={() => setExpanded(!expanded)} className="text-[9px] font-data text-[var(--text-label)] mt-1">
              {expanded ? 'Recolher' : 'Ler mais'}
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs font-body text-[var(--text-ghost)] italic mb-2">
          Este ser ainda não foi registrado pelos sábios de Ellia.
        </p>
      )}

      {/* Drops */}
      {entry.knownDrops.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entry.knownDrops.map((drop) => (
            <span key={drop} className="px-2 py-0.5 text-[8px] font-data bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm text-[var(--text-secondary)]">
              {drop}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[9px] font-data text-[var(--text-ghost)]">
        <span>Derrotado {entry.totalDefeated}×</span>
        <span>{new Date(entry.firstDefeatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  )
}

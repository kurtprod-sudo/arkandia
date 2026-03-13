'use client'

import type { CharacterReputation, ReputationStage } from '@/types'

interface ArkReputationListProps {
  reputations: CharacterReputation[]
}

const STAGE_CONFIG: Record<ReputationStage, { label: string; color: string }> = {
  hostil:      { label: 'Hostil',      color: 'text-red-400' },
  neutro:      { label: 'Neutro',      color: 'text-[var(--text-ghost)]' },
  reconhecido: { label: 'Reconhecido', color: 'text-[var(--text-label)]' },
  aliado:      { label: 'Aliado',      color: 'text-[var(--ark-amber)]' },
  venerado:    { label: 'Venerado',    color: 'text-[var(--ark-gold-bright)]' },
}

export default function ArkReputationList({ reputations }: ArkReputationListProps) {
  if (reputations.length === 0) {
    return (
      <p className="text-[var(--text-ghost)] text-sm font-body italic">
        Nenhuma facção reconhece este personagem ainda.
      </p>
    )
  }

  return (
    <div className="space-y-0">
      {reputations.map((rep, i) => {
        const faction = rep.factions as unknown as Record<string, unknown> | null
        const factionName = faction?.name as string ?? 'Facção desconhecida'
        const stage = rep.stage as ReputationStage
        const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.neutro

        return (
          <div key={rep.id}>
            {i > 0 && <div className="h-px bg-[#1a0808] opacity-30 my-2" />}
            <div className="flex items-center justify-between py-1">
              <span className="font-body text-sm text-[var(--text-primary)] text-readable">
                {factionName}
              </span>
              <span className={`font-data text-xs tracking-[0.15em] uppercase ${config.color}`}>
                {config.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

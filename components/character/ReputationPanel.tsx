'use client'

import ArkBadge from '@/components/ui/ArkBadge'

type ReputationStage = 'hostil' | 'neutro' | 'reconhecido' | 'aliado' | 'venerado'

interface FactionRep {
  id: string
  points: number
  stage: ReputationStage
  factions: {
    id: string
    name: string
    slug: string
    type: string
    is_hidden: boolean
  } | null
}

const STAGE_COLORS: Record<ReputationStage, string> = {
  hostil:      'text-[var(--ark-red-glow)]',
  neutro:      'text-[var(--text-ghost)]',
  reconhecido: 'text-[var(--ark-amber)]',
  aliado:      'text-status-alive',
  venerado:    'text-[var(--ark-gold-bright)]',
}

const STAGE_BG: Record<ReputationStage, string> = {
  hostil:      'bg-[var(--ark-red-glow)]',
  neutro:      'bg-[var(--text-ghost)]',
  reconhecido: 'bg-[var(--ark-amber)]',
  aliado:      'bg-status-alive',
  venerado:    'bg-[var(--ark-gold-bright)]',
}

const STAGE_LABELS: Record<ReputationStage, string> = {
  hostil:      'Hostil',
  neutro:      'Neutro',
  reconhecido: 'Reconhecido',
  aliado:      'Aliado',
  venerado:    'Venerado',
}

const STAGE_RANGES: Record<ReputationStage, [number, number]> = {
  hostil:      [-999, -1],
  neutro:      [0,    99],
  reconhecido: [100, 299],
  aliado:      [300, 699],
  venerado:    [700, 999],
}

function getNextStage(stage: ReputationStage): { label: string; threshold: number } | null {
  const order: ReputationStage[] = ['hostil', 'neutro', 'reconhecido', 'aliado', 'venerado']
  const idx = order.indexOf(stage)
  if (idx >= order.length - 1) return null
  const next = order[idx + 1]
  return { label: STAGE_LABELS[next], threshold: STAGE_RANGES[next][0] }
}

function getStageProgress(points: number, stage: ReputationStage): number {
  const [min, max] = STAGE_RANGES[stage]
  const range = max - min
  if (range <= 0) return 100
  return Math.max(0, Math.min(100, Math.round(((points - min) / range) * 100)))
}

interface ReputationPanelProps {
  reputations: FactionRep[]
}

export default function ReputationPanel({ reputations }: ReputationPanelProps) {
  // Split into public and secret (discovered)
  const publicFactions = reputations.filter((r) => r.factions && !r.factions.is_hidden)
  const secretFactions = reputations.filter((r) => r.factions?.is_hidden && r.points !== 0)

  const renderFaction = (rep: FactionRep) => {
    if (!rep.factions) return null
    const stage = rep.stage as ReputationStage
    const progress = getStageProgress(rep.points, stage)
    const next = getNextStage(stage)

    return (
      <div
        key={rep.id}
        className="bg-[var(--ark-bg)] rounded-sm p-4 border border-[var(--ark-border)]"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-data font-semibold text-[var(--text-primary)]">
              {rep.factions.name}
            </p>
            <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
              {rep.factions.type}
            </p>
          </div>
          <span className={`text-xs font-data font-bold uppercase tracking-wider ${STAGE_COLORS[stage]}`}>
            {STAGE_LABELS[stage]}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[var(--ark-surface)] rounded-full overflow-hidden mb-1.5">
          <div
            className={`h-full rounded-full transition-all ${STAGE_BG[stage]}`}
            style={{ width: `${progress}%`, opacity: 0.7 }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-data text-[var(--text-label)]">
            {rep.points} pts
          </span>
          {next && (
            <span className="text-[10px] font-data text-[var(--text-label)]">
              {next.threshold - rep.points} para {next.label}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {publicFactions.length > 0 && (
        <div>
          <h4 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">
            Facções
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {publicFactions.map(renderFaction)}
          </div>
        </div>
      )}

      {secretFactions.length > 0 && (
        <div>
          <h4 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">
            Organizações
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {secretFactions.map(renderFaction)}
          </div>
        </div>
      )}

      {reputations.length === 0 && (
        <p className="text-xs font-body text-[var(--text-label)] italic text-center py-6">
          Nenhuma reputação registrada.
        </p>
      )}
    </div>
  )
}

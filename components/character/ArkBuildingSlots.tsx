import ArkBadge from '@/components/ui/ArkBadge'

export interface BuildingSlotData {
  slot: number
  skill: {
    id: string
    name: string
    skill_type: string
    eter_cost: number
    range_state: string
  } | null
}

interface Props {
  slots: BuildingSlotData[]
}

const SKILL_TYPE_LABELS: Record<string, string> = {
  ativa: 'Ativa',
  passiva: 'Passiva',
  reativa: 'Reativa',
}

const SKILL_TYPE_COLOR: Record<string, 'crimson' | 'archetype' | 'bronze'> = {
  ativa: 'crimson',
  passiva: 'bronze',
  reativa: 'archetype',
}

export default function ArkBuildingSlots({ slots }: Props) {
  const allSlots: BuildingSlotData[] = Array.from({ length: 6 }, (_, i) => {
    const existing = slots.find((s) => s.slot === i + 1)
    return existing ?? { slot: i + 1, skill: null }
  })

  return (
    <div className="grid grid-cols-3 gap-2">
      {allSlots.map((s) => (
        <div
          key={s.slot}
          className={`relative p-3 rounded-sm border text-center transition-colors ${
            s.skill
              ? 'bg-[var(--ark-bg)] border-[#2a1008] hover:border-[#6e160f]'
              : 'bg-[var(--ark-bg)]/50 border-[var(--ark-border)] opacity-40'
          }`}
        >
          <p className="font-data text-[9px] text-[var(--text-ghost)] uppercase tracking-wider mb-1">
            Slot {s.slot}
          </p>
          {s.skill ? (
            <>
              <p className="font-body text-xs text-[var(--text-primary)] font-semibold truncate">
                {s.skill.name}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <ArkBadge
                  color={SKILL_TYPE_COLOR[s.skill.skill_type] ?? 'bronze'}
                  className="text-[8px] px-1 py-0"
                >
                  {SKILL_TYPE_LABELS[s.skill.skill_type] ?? s.skill.skill_type}
                </ArkBadge>
                {s.skill.eter_cost > 0 && (
                  <span className="font-data text-[9px] text-attr-eter">
                    {s.skill.eter_cost} éter
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="font-body text-xs text-[var(--text-ghost)] italic">Vazio</p>
          )}
        </div>
      ))}
    </div>
  )
}

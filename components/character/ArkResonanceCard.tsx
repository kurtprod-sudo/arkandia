interface Props {
  archetype: string | null
  resonanceLevel: number
  isUnlocked: boolean
  characterLevel: number
}

export default function ArkResonanceCard({
  archetype,
  resonanceLevel,
  isUnlocked,
  characterLevel,
}: Props) {
  if (isUnlocked && archetype) {
    return (
      <div className="p-4 rounded-sm border border-[var(--ark-gold-dim)] bg-[#3A2A18]/20">
        <p className="font-data text-[10px] tracking-[0.2em] text-[var(--text-label)] uppercase mb-1">
          Ressonância
        </p>
        <p className="font-display text-lg font-bold text-[var(--ark-gold-bright)]">
          {archetype.charAt(0).toUpperCase() + archetype.slice(1)}
        </p>
        {resonanceLevel > 0 && (
          <p className="font-data text-xs text-[var(--text-secondary)] mt-1">
            Nível de Ressonância: {resonanceLevel}
          </p>
        )}
      </div>
    )
  }

  const canUnlock = characterLevel >= 5

  return (
    <div className="p-4 rounded-sm border border-[var(--ark-border)] bg-[var(--ark-bg)]/50 opacity-60">
      <p className="font-data text-[10px] tracking-[0.2em] text-[var(--text-ghost)] uppercase mb-1">
        Ressonância
      </p>
      <p className="font-body text-xs text-[var(--text-ghost)] italic">
        {canUnlock ? 'Dormente — pronta para despertar' : 'Desbloqueada no nível 5'}
      </p>
    </div>
  )
}

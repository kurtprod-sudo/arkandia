interface ArkStatBarProps {
  label: string
  current: number
  max: number
  type?: 'hp' | 'eter' | 'xp' | 'moral'
  className?: string
}

const barGradients = {
  hp: 'from-wine-dark via-wine-mid to-wine-glow',
  eter: 'from-cyan-900 via-cyan-700 to-attr-eter',
  xp: 'from-bronze-dark via-bronze-mid to-gold-pure',
  moral: 'from-amber-900 via-amber-600 to-status-injured',
}

const labelColors = {
  hp: 'text-wine-glow',
  eter: 'text-attr-eter',
  xp: 'text-gold-pure',
  moral: 'text-status-injured',
}

export default function ArkStatBar({
  label,
  current,
  max,
  type = 'hp',
  className = '',
}: ArkStatBarProps) {
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0

  return (
    <div className={className}>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-body text-ark-text-secondary uppercase tracking-wider">
          {label}
        </span>
        <span className={`text-xs font-data font-bold tabular-nums ${labelColors[type]}`}>
          {current} / {max}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-ark-bg-primary border border-bronze-dark/20 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradients[type]} transition-all duration-500 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

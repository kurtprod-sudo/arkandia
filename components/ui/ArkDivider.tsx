interface ArkDividerProps {
  variant?: 'light' | 'dark'
  className?: string
}

export default function ArkDivider({ variant = 'light', className = '' }: ArkDividerProps) {
  const lineColor = variant === 'light'
    ? 'from-transparent via-bronze-mid/40 to-transparent'
    : 'from-transparent via-bronze-dark/40 to-transparent'

  const diamondColor = variant === 'light'
    ? 'border-bronze-mid/60 bg-bronze-dark/30'
    : 'border-bronze-dark/60 bg-ark-bg-primary'

  return (
    <div className={`flex items-center gap-0 my-4 ${className}`}>
      <div className={`flex-1 h-px bg-gradient-to-r ${lineColor}`} />
      <div className={`w-2 h-2 rotate-45 border ${diamondColor} mx-3 flex-shrink-0`} />
      <div className={`flex-1 h-px bg-gradient-to-r ${lineColor}`} />
    </div>
  )
}

interface ArkDividerProps {
  variant?: 'default' | 'ornamental' | 'dark' | 'light'
  className?: string
}

export default function ArkDivider({
  variant = 'default',
  className = '',
}: ArkDividerProps) {
  const lineOpacity = variant === 'dark' ? 'opacity-30' : 'opacity-60'
  const showDiamond = variant !== 'dark'
  const isOrnamental = variant === 'ornamental'

  return (
    <div className={`flex items-center gap-0 my-4 ${className}`}>
      <div
        className={`flex-1 h-px bg-gradient-to-r from-transparent via-[var(--ark-gold-dim)] to-transparent ${lineOpacity}`}
      />
      {showDiamond && (
        <div className="mx-3 flex-shrink-0">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className={isOrnamental ? 'animate-rune-pulse' : ''}>
            <rect
              x="1"
              y="1"
              width="6"
              height="6"
              fill="var(--ark-gold-dim)"
              stroke="var(--ark-gold)"
              strokeWidth="0.5"
              transform="rotate(45 4 4)"
            />
          </svg>
        </div>
      )}
      <div
        className={`flex-1 h-px bg-gradient-to-r from-transparent via-[var(--ark-gold-dim)] to-transparent ${lineOpacity}`}
      />
    </div>
  )
}

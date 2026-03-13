import { type ReactNode } from 'react'

interface ArkCardProps {
  children: ReactNode
  variant?: 'default' | 'highlighted' | 'legendary'
  className?: string
}

const CornerOrnament = ({ className = '' }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path
      d="M0 6 L0 0 L6 0"
      stroke="var(--color-orn-gold)"
      strokeWidth="1"
      fill="none"
    />
    <path
      d="M2 4 L2 2 L4 2"
      stroke="var(--color-orn-dim)"
      strokeWidth="0.75"
      fill="none"
    />
  </svg>
)

const variantStyles = {
  default:
    'border border-[var(--ark-gold-dim)] bg-[var(--ark-bg)] bg-dot-pattern',
  highlighted:
    'border border-[var(--ark-gold)] bg-[var(--ark-bg)] bg-dot-pattern shadow-glow-gold',
  legendary:
    'border border-[var(--ark-gold-bright)] bg-[var(--ark-bg)] bg-dot-pattern shimmer-legendary',
}

export default function ArkCard({
  children,
  variant = 'default',
  className = '',
}: ArkCardProps) {
  const sizeClass = variant === 'legendary' ? 'w-6 h-6' : 'w-5 h-5'

  return (
    <div
      className={`
        relative rounded-lg p-5 overflow-visible
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {/* Ornamental corners */}
      <div className={`absolute top-0 left-0 ${sizeClass} pointer-events-none`}>
        <CornerOrnament />
      </div>
      <div className={`absolute top-0 right-0 ${sizeClass} pointer-events-none scale-x-[-1]`}>
        <CornerOrnament />
      </div>
      <div className={`absolute bottom-0 left-0 ${sizeClass} pointer-events-none scale-y-[-1]`}>
        <CornerOrnament />
      </div>
      <div className={`absolute bottom-0 right-0 ${sizeClass} pointer-events-none scale-x-[-1] scale-y-[-1]`}>
        <CornerOrnament />
      </div>

      {variant === 'legendary' && (
        <div className="pointer-events-none absolute inset-0 rounded-lg border border-[#f0c84a]/20 animate-pulse-glow" />
      )}
      {children}
    </div>
  )
}

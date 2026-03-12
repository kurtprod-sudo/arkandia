import { type ReactNode } from 'react'

interface ArkCardProps {
  children: ReactNode
  variant?: 'default' | 'highlighted' | 'legendary'
  className?: string
}

const variantStyles = {
  default:
    'border-bronze-dark/30 bg-ark-bg-secondary',
  highlighted:
    'border-wine-glow/50 bg-ark-bg-secondary glow-wine',
  legendary:
    'border-gold-pure/60 bg-ark-bg-secondary glow-gold shimmer',
}

export default function ArkCard({
  children,
  variant = 'default',
  className = '',
}: ArkCardProps) {
  return (
    <div
      className={`
        relative rounded-lg border p-5
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {variant === 'legendary' && (
        <div className="pointer-events-none absolute inset-0 rounded-lg border border-gold-pure/20 animate-pulse-glow" />
      )}
      {children}
    </div>
  )
}

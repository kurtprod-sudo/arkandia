import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ArkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

const variantStyles = {
  primary: [
    'bg-gradient-to-r from-wine-dark to-wine-mid',
    'text-bronze-glow border border-bronze-mid/30',
    'hover:from-wine-mid hover:to-wine-light hover:shadow-glow-wine',
    'disabled:from-wine-dark/50 disabled:to-wine-dark/50 disabled:text-ark-text-muted disabled:border-bronze-dark/10',
  ].join(' '),
  secondary: [
    'bg-transparent',
    'text-bronze-light border border-bronze-mid/50',
    'hover:bg-bronze-dark/20 hover:border-bronze-light/60 hover:text-bronze-glow',
    'disabled:text-ark-text-muted disabled:border-bronze-dark/20',
  ].join(' '),
  ghost: [
    'bg-transparent border-none',
    'text-ark-text-secondary',
    'hover:text-ark-text-primary hover:bg-ark-bg-tertiary',
    'disabled:text-ark-text-muted',
  ].join(' '),
  danger: [
    'bg-gradient-to-r from-red-950 to-red-900',
    'text-red-200 border border-red-800/40',
    'hover:from-red-900 hover:to-red-800',
    'disabled:from-red-950/50 disabled:to-red-950/50 disabled:text-red-900',
  ].join(' '),
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs rounded',
  md: 'px-5 py-2.5 text-sm rounded-md',
  lg: 'px-8 py-3 text-base rounded-lg',
}

export default function ArkButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ArkButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        font-body font-semibold
        transition-all duration-200 ease-out
        disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ArkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

const variantStyles = {
  primary: [
    'bg-[var(--text-ghost)] border border-[var(--ark-gold)]',
    'text-[var(--ark-gold-bright)]',
    'border-t-[#f0c84a]/60 border-b-[#7a5a18]/80',
    'hover:bg-[#3A2A18]/80 hover:border-[#f0c84a]/50',
    'disabled:bg-[#3A2A18]/30 disabled:text-[var(--text-ghost)] disabled:border-[var(--ark-gold-dim)]',
  ].join(' '),
  secondary: [
    'bg-transparent border border-[var(--ark-gold-dim)]',
    'text-[var(--text-secondary)]',
    'hover:border-[var(--ark-gold)] hover:text-[var(--ark-gold-bright)]',
    'disabled:text-[var(--text-label)] disabled:border-[var(--text-ghost)]',
  ].join(' '),
  ghost: [
    'bg-transparent border-none',
    'text-[var(--text-label)]',
    'hover:text-[var(--text-secondary)]',
    'disabled:text-[var(--text-ghost)]',
  ].join(' '),
  danger: [
    'bg-transparent border border-[var(--ark-red)]',
    'text-[var(--ark-red-glow)]',
    'hover:bg-[#6e160f]/30',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs rounded-sm',
  md: 'px-6 py-2.5 text-xs rounded-sm',
  lg: 'px-8 py-3 text-sm rounded-sm',
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
        font-data font-semibold tracking-widest uppercase
        transition-all duration-200 ease-out
        cursor-pointer
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

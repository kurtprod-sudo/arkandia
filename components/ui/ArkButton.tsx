import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ArkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

const variantStyles = {
  primary: [
    'bg-[var(--ark-red)] border border-[var(--ark-border-bright)]',
    'text-[var(--text-primary)]',
    'hover:bg-[var(--ark-red-bright)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
  secondary: [
    'bg-transparent border border-[var(--ark-border)]',
    'text-[var(--text-secondary)]',
    'hover:border-[var(--ark-border-bright)] hover:text-[var(--text-primary)]',
    'disabled:text-[var(--text-ghost)] disabled:border-[var(--text-ghost)]',
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

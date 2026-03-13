import { type InputHTMLAttributes } from 'react'

interface ArkInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  className?: string
}

export default function ArkInput({ label, id, className = '', ...props }: ArkInputProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-data text-[var(--text-secondary)] uppercase tracking-wider mb-1.5" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="
          w-full px-4 py-2.5 rounded-sm
          bg-[var(--ark-bg-raised)] border border-[var(--ark-gold-dim)]
          text-[var(--text-primary)] font-data text-sm
          placeholder:text-[var(--text-label)]
          focus:outline-none focus:border-[var(--ark-gold)] focus:ring-1 focus:ring-[#d3a539]/30
          transition-all duration-200
        "
        {...props}
      />
    </div>
  )
}

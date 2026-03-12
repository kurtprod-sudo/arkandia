import { type InputHTMLAttributes } from 'react'

interface ArkInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  className?: string
}

export default function ArkInput({ label, id, className = '', ...props }: ArkInputProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-body text-ark-text-secondary uppercase tracking-wider mb-1.5" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="
          w-full px-4 py-2.5 rounded-lg
          bg-ark-bg-primary border border-bronze-dark/30
          text-ark-text-primary font-body text-sm
          placeholder:text-ark-text-muted
          focus:outline-none focus:border-bronze-mid/60 focus:shadow-glow-bronze/20
          transition-all duration-200
        "
        {...props}
      />
    </div>
  )
}

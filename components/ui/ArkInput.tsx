import { type InputHTMLAttributes } from 'react'

interface ArkInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  className?: string
}

export default function ArkInput({ label, id, className = '', ...props }: ArkInputProps) {
  return (
    <div className={className}>
      <label
        className="block text-[11px] font-semibold tracking-[0.15em] uppercase mb-1.5 text-[var(--text-label)]"
        style={{ fontFamily: 'var(--font-intelo)' }}
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        className="
          w-full px-3.5 py-2.5 rounded-sm
          bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)]
          text-[var(--text-primary)] text-sm
          placeholder:text-[var(--text-ghost)]
          focus:outline-none focus:border-[var(--ark-border-bright)]
          transition-all duration-200
        "
        style={{ fontFamily: 'var(--font-intelo)' }}
        {...props}
      />
    </div>
  )
}

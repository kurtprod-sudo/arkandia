'use client'

import { useEffect, type ReactNode } from 'react'
import ArkCard from './ArkCard'
import ArkDivider from './ArkDivider'

interface ArkModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export default function ArkModal({
  open,
  onClose,
  title,
  children,
  actions,
  className = '',
}: ArkModalProps) {
  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
        onClick={onClose}
      />

      <ArkCard variant="highlighted" className={`relative w-full max-w-lg mx-auto ${className}`}>
        <div className="px-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-[var(--ark-gold-bright)] text-glow-gold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="font-data text-[var(--text-label)] hover:text-[var(--text-primary)] transition-colors text-lg leading-none px-1"
            >
              &#x2715;
            </button>
          </div>
          <ArkDivider variant="ornamental" className="my-3" />
        </div>

        <div className="font-body text-sm text-[var(--text-secondary)] italic px-2">
          {children}
        </div>

        {actions && (
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#7a5a18]/40 px-2">
            {actions}
          </div>
        )}
      </ArkCard>
    </div>
  )
}

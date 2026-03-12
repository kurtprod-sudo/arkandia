'use client'

import { useEffect, type ReactNode } from 'react'

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative w-full max-w-lg
          bg-ark-bg-secondary border border-bronze-dark/40
          rounded-xl shadow-2xl shadow-black/60
          ${className}
        `}
      >
        {/* Ornamental top border */}
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-bronze-mid/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="font-display text-lg text-gold-pure text-glow-bronze">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-ark-text-muted hover:text-ark-text-primary transition-colors text-lg leading-none"
          >
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 font-body text-sm text-ark-text-secondary">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-3 px-6 pb-5 pt-2 border-t border-bronze-dark/20">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

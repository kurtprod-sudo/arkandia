'use client'

import { useState, type ReactNode } from 'react'

interface ArkTooltipProps {
  content: ReactNode
  children: ReactNode
  className?: string
}

export default function ArkTooltip({ content, children, className = '' }: ArkTooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
          <div className="bg-[var(--ark-bg-raised)] border border-[var(--ark-gold-dim)] rounded-sm px-3 py-1.5 font-data text-xs shadow-[0_4px_16px_rgba(0,0,0,0.6)] whitespace-nowrap">
            {content}
          </div>
          <div className="w-2 h-2 bg-[var(--ark-bg-raised)] border-r border-b border-[var(--ark-gold-dim)] rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
        </div>
      )}
    </div>
  )
}

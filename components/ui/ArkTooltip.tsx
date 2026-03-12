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
          <div className="bg-ark-bg-secondary border border-bronze-dark/50 rounded-md px-3 py-2 shadow-lg shadow-black/40 whitespace-nowrap">
            <div className="text-xs font-body text-ark-text-primary">{content}</div>
          </div>
          <div className="w-2 h-2 bg-ark-bg-secondary border-r border-b border-bronze-dark/50 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
        </div>
      )}
    </div>
  )
}

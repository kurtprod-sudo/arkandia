'use client'

import { useEffect, useState } from 'react'

interface ArkStatBarProps {
  label: string
  current: number
  max: number
  type?: 'hp' | 'eter' | 'xp' | 'moral'
  className?: string
}

const barGradients: Record<string, string> = {
  hp: 'linear-gradient(to right, #6e160f, #c42a1e)',
  eter: 'linear-gradient(to right, #2a2a35, #c8ccd8)',
  xp: 'linear-gradient(to right, #2a1a08, #d3a539)',
}

function getMoralGradient(percent: number): string {
  if (percent >= 66) return 'linear-gradient(to right, #1a3a1a, #40c040)'
  if (percent >= 33) return 'linear-gradient(to right, #3a3a1a, #c0c040)'
  return 'linear-gradient(to right, #3a1a1a, #c04040)'
}

const labelColors = {
  hp: 'text-[var(--ark-red-glow)]',
  eter: 'text-attr-eter',
  xp: 'text-[var(--ark-gold-bright)]',
  moral: 'text-attr-moral',
}

export default function ArkStatBar({
  label,
  current,
  max,
  type = 'hp',
  className = '',
}: ArkStatBarProps) {
  const [mounted, setMounted] = useState(false)
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className={className}>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-data text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </span>
        <span className={`text-xs font-data font-bold tabular-nums ${labelColors[type]}`}>
          {current} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#1e1210] border border-[var(--text-ghost)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: mounted ? `${percent}%` : '0%',
            ['--bar-target' as string]: `${percent}%`,
            background: type === 'moral' ? getMoralGradient(percent) : barGradients[type],
          }}
        />
      </div>
    </div>
  )
}

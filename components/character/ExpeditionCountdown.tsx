'use client'

import { useEffect, useState } from 'react'

interface ExpeditionCountdownProps {
  endsAt: string
  onComplete?: () => void
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Concluída'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export default function ExpeditionCountdown({ endsAt, onComplete }: ExpeditionCountdownProps) {
  const [remaining, setRemaining] = useState(() => {
    return new Date(endsAt).getTime() - Date.now()
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const ms = new Date(endsAt).getTime() - Date.now()
      setRemaining(ms)
      if (ms <= 0) {
        clearInterval(timer)
        onComplete?.()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [endsAt, onComplete])

  const isComplete = remaining <= 0

  return (
    <span className={`font-data text-sm ${isComplete ? 'text-green-400' : 'text-[var(--text-secondary)]'}`}>
      {formatTimeRemaining(remaining)}
    </span>
  )
}

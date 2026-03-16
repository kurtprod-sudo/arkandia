'use client'

import { useState, useEffect } from 'react'

function format(ms: number): string {
  if (ms <= 0) return 'agora'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  return `${h}h ${m}m`
}

export default function ColiseuCountdown({ label, targetIso }: { label: string; targetIso: number }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => setRemaining(format(targetIso - Date.now()))
    update()
    const i = setInterval(update, 60000)
    return () => clearInterval(i)
  }, [targetIso])

  return (
    <span className="text-[10px] font-data text-[var(--text-ghost)]">
      {label}: {remaining}
    </span>
  )
}

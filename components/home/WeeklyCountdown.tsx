'use client'

import { useState, useEffect } from 'react'

function format(ms: number): string {
  if (ms <= 0) return 'agora'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${d}d ${h}h ${m}m`
}

export default function WeeklyCountdown({ nextReset }: { nextReset: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => setRemaining(format(new Date(nextReset).getTime() - Date.now()))
    update()
    const i = setInterval(update, 60000)
    return () => clearInterval(i)
  }, [nextReset])

  return <span className="text-[10px] font-data text-[var(--text-label)]">{remaining}</span>
}

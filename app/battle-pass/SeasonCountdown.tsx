'use client'

import { useState, useEffect } from 'react'

function format(ms: number): string {
  if (ms <= 0) return 'Encerrada'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  return `${d}d ${h}h`
}

export default function SeasonCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    const update = () => setRemaining(format(new Date(endsAt).getTime() - Date.now()))
    update()
    const i = setInterval(update, 60000)
    return () => clearInterval(i)
  }, [endsAt])

  return <span className="text-[10px] font-data text-[var(--text-ghost)]">Encerra em {remaining}</span>
}

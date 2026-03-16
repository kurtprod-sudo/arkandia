'use client'

import { useState, useEffect } from 'react'

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Pronto'
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(mins / 60)
  const m = mins % 60
  return hrs > 0 ? `${hrs}h${m}m` : `${m}m`
}

export default function RecruitmentCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => {
      const ms = new Date(endsAt).getTime() - Date.now()
      setRemaining(formatRemaining(ms))
    }
    update()
    const i = setInterval(update, 30000)
    return () => clearInterval(i)
  }, [endsAt])

  return (
    <span className={`text-[10px] font-data ${remaining === 'Pronto' ? 'text-status-alive' : 'text-[var(--text-label)]'}`}>
      {remaining}
    </span>
  )
}

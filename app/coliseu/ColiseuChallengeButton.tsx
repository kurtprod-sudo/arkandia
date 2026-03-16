'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'

export default function ColiseuChallengeButton({ defenderCharacterId }: { defenderCharacterId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ result: string; pointsDelta: number; newPoints: number } | null>(null)

  const handleChallenge = async () => {
    setLoading(true)
    const res = await fetch('/api/coliseu/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defender_character_id: defenderCharacterId }),
    })
    const data = await res.json()
    if (data.success) {
      setResult({ result: data.result, pointsDelta: data.pointsDelta, newPoints: data.newPoints })
      setTimeout(() => router.refresh(), 2000)
    }
    setLoading(false)
  }

  if (result) {
    const color = result.result === 'win' ? 'text-status-alive' : result.result === 'loss' ? 'text-[var(--ark-red-glow)]' : 'text-[var(--text-label)]'
    return (
      <span className={`text-xs font-data ${color}`}>
        {result.result === 'win' ? 'Vitória' : result.result === 'loss' ? 'Derrota' : 'Empate'} ({result.pointsDelta >= 0 ? '+' : ''}{result.pointsDelta})
      </span>
    )
  }

  return (
    <ArkButton size="sm" onClick={handleChallenge} disabled={loading}>
      {loading ? '...' : 'Desafiar'}
    </ArkButton>
  )
}

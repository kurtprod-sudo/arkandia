'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'

export default function BossClaimButton({ bossId }: { bossId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ libras: number; essencia: number; xp: number } | null>(null)

  const handleClaim = async () => {
    setLoading(true)
    const res = await fetch('/api/boss/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boss_id: bossId }),
    })
    const data = await res.json()
    if (data.success && data.rewards) setResult(data.rewards)
    router.refresh()
    setLoading(false)
  }

  if (result) {
    return (
      <p className="text-xs font-data text-status-alive mt-2">
        +{result.libras} Libras, +{result.essencia} Essências, +{result.xp} XP
      </p>
    )
  }

  return (
    <ArkButton size="sm" onClick={handleClaim} disabled={loading} className="mt-3">
      {loading ? 'Resgatando...' : 'Resgatar Recompensa'}
    </ArkButton>
  )
}

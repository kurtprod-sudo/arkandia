'use client'

import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'

const REINVESTMENT_COST = [0, 500, 1200, 2500, 4500, 7500, 12000, 20000]
const MULTIPLIER_LABELS = ['×1.0', '×1.2', '×1.5', '×1.8', '×2.2', '×2.7', '×3.3', '×4.0']

interface Props {
  societyId: string
  territoryId: string
  currentLevel: number
  treasuryLibras: number
  onSuccess: () => void
}

export default function ReinvestButton({
  societyId, territoryId, currentLevel, treasuryLibras, onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxLevel = REINVESTMENT_COST.length - 1
  const isMax = currentLevel >= maxLevel
  const nextLevel = currentLevel + 1
  const nextCost = !isMax ? REINVESTMENT_COST[nextLevel] : 0
  const canAfford = treasuryLibras >= nextCost

  async function handleReinvest() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/society/territory/reinvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ society_id: societyId, territory_id: territoryId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erro ao reinvestir.')
      } else {
        onSuccess()
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  if (isMax) {
    return (
      <p className="text-[10px] font-data text-[var(--ark-gold-bright)]">
        Nível máximo {MULTIPLIER_LABELS[maxLevel]}
      </p>
    )
  }

  return (
    <div>
      <p className="text-[10px] font-data text-[var(--text-label)] mb-1">
        Nível {currentLevel} {MULTIPLIER_LABELS[currentLevel]} → {nextLevel} {MULTIPLIER_LABELS[nextLevel]}
      </p>
      {error && <p className="text-[10px] text-[var(--ark-red-glow)] mb-1">{error}</p>}
      <ArkButton
        variant="secondary"
        onClick={handleReinvest}
        disabled={loading || !canAfford}
        className="text-[10px] py-1 px-3"
      >
        {loading ? 'Reinvestindo...' : `Reinvestir — ${nextCost} Libras do Cofre`}
      </ArkButton>
      {!canAfford && (
        <p className="text-[10px] font-data text-[var(--text-ghost)] mt-0.5">
          Cofre insuficiente ({treasuryLibras}/{nextCost})
        </p>
      )}
    </div>
  )
}

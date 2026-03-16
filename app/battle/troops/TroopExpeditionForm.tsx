'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import { startTroopExpeditionAction } from '@/app/actions/troops'

type TroopType = 'infantaria' | 'arquearia' | 'cavalaria' | 'cerco'

interface TroopStock {
  infantaria: number
  arquearia: number
  cavalaria: number
  cerco: number
}

// Client-side copy of troop constants (mirrors lib/game/troops.ts)
const TROOP_ADVANTAGE: Partial<Record<TroopType, TroopType>> = {
  arquearia: 'cavalaria',
  cavalaria: 'infantaria',
  infantaria: 'arquearia',
}

const CERCO_PER_LOT = 2

function calcModifier(deployment: Record<string, number>, resistanceType: string): number {
  let modifier = 0
  const rt = resistanceType as TroopType

  const advantageousType = (Object.entries(TROOP_ADVANTAGE) as Array<[TroopType, TroopType]>)
    .find(([, weak]) => weak === rt)?.[0]

  const disadvantagedType = TROOP_ADVANTAGE[rt]

  if (advantageousType && (deployment[advantageousType] ?? 0) > 0) modifier += 0.15

  const cercoCount = deployment.cerco ?? 0
  if (cercoCount > 0) {
    const cercoLots = Math.floor(cercoCount / CERCO_PER_LOT)
    modifier += Math.min(0.20, cercoLots * 0.05)
  }

  if (disadvantagedType) {
    const totalTroops = Object.values(deployment).reduce((s, v) => s + (v ?? 0), 0)
    const disadCount = deployment[disadvantagedType] ?? 0
    if (totalTroops > 0 && disadCount / totalTroops > 0.5) modifier -= 0.10
  }

  return Math.max(-0.20, Math.min(0.35, modifier))
}

interface Props {
  expeditionTypeId: string
  resistanceType: string
  stock: TroopStock
  capacity: number
}

export default function TroopExpeditionForm({ expeditionTypeId, resistanceType, stock, capacity }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deployment, setDeployment] = useState<Record<string, number>>({
    infantaria: 0, arquearia: 0, cavalaria: 0, cerco: 0,
  })

  const total = Object.values(deployment).reduce((s, v) => s + v, 0)
  const modifier = calcModifier(deployment, resistanceType)
  const modifierStr = modifier >= 0 ? `+${(modifier * 100).toFixed(0)}%` : `${(modifier * 100).toFixed(0)}%`

  const handleSend = async () => {
    setLoading(true)
    setError('')
    const result = await startTroopExpeditionAction(expeditionTypeId, deployment)
    if (!result.success) setError(result.error ?? 'Erro.')
    else router.refresh()
    setLoading(false)
  }

  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        {(['infantaria', 'arquearia', 'cavalaria', 'cerco'] as const).map((tt) => (
          <div key={tt} className="text-center">
            <p className="text-[9px] font-data text-[var(--text-label)] uppercase">{tt}</p>
            <input
              type="number"
              min={0}
              max={Math.min(stock[tt], capacity - total + (deployment[tt] ?? 0))}
              value={deployment[tt]}
              onChange={(e) => setDeployment((d) => ({ ...d, [tt]: Math.max(0, Number(e.target.value)) }))}
              className="w-full px-2 py-1 text-xs text-center bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"
            />
            <p className="text-[8px] font-data text-[var(--text-ghost)]">/{stock[tt]}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-data text-[var(--text-label)]">
          Total: {total}/{capacity}
        </span>
        <span className={`text-[10px] font-data ${modifier >= 0 ? 'text-status-alive' : 'text-[var(--ark-red-glow)]'}`}>
          Modificador: {modifierStr}
        </span>
      </div>
      {error && <p className="text-[10px] font-data text-[var(--ark-red-glow)] mb-2">{error}</p>}
      <ArkButton size="sm" onClick={handleSend} disabled={loading || total <= 0} className="w-full">
        {loading ? 'Enviando...' : 'Enviar Expedição'}
      </ArkButton>
    </div>
  )
}

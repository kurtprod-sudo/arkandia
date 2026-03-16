'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import { startTroopExpeditionAction } from '@/app/actions/troops'
import { calcTroopSuccessModifier, type TroopType, type TroopStock } from '@/lib/game/troops'

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
  const modifier = calcTroopSuccessModifier(deployment, resistanceType as TroopType)
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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'

const ATTRIBUTES = [
  { key: 'ataque',     label: 'Ataque',     abbr: 'ATQ' },
  { key: 'magia',      label: 'Magia',      abbr: 'MAG' },
  { key: 'defesa',     label: 'Defesa',     abbr: 'DEF' },
  { key: 'vitalidade', label: 'Vitalidade', abbr: 'VIT' },
  { key: 'velocidade', label: 'Velocidade', abbr: 'VEL' },
  { key: 'precisao',   label: 'Precisão',   abbr: 'PRE' },
  { key: 'tenacidade', label: 'Tenacidade', abbr: 'TEN' },
  { key: 'capitania',  label: 'Capitania',  abbr: 'CAP' },
] as const

interface DistributePointsPanelProps {
  availablePoints: number
  currentAttrs: Record<string, number>
}

export default function DistributePointsPanel({
  availablePoints,
  currentAttrs,
}: DistributePointsPanelProps) {
  const router = useRouter()
  const [pending, setPending] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  const totalPending = Object.values(pending).reduce((a, b) => a + b, 0)
  const remaining = availablePoints - totalPending

  const increment = (key: string) => {
    if (remaining <= 0) return
    setPending((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }))
  }

  const decrement = (key: string) => {
    if ((pending[key] ?? 0) <= 0) return
    setPending((prev) => ({ ...prev, [key]: (prev[key] ?? 0) - 1 }))
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      for (const [attr, amount] of Object.entries(pending)) {
        if (amount <= 0) continue
        await fetch('/api/character/distribute-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attribute: attr, amount }),
        })
      }
      setPending({})
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (availablePoints <= 0) return null

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-gold)]/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display font-bold text-[var(--ark-gold-bright)] uppercase tracking-wider">
          Pontos Livres para Distribuir
        </h3>
        <span className="text-lg font-display font-bold text-[var(--ark-gold-bright)]">
          {remaining}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {ATTRIBUTES.map((attr) => {
          const current = currentAttrs[attr.key] ?? 0
          const added = pending[attr.key] ?? 0
          return (
            <div
              key={attr.key}
              className="bg-[var(--ark-bg)] rounded-sm p-3 border border-[var(--ark-border)] flex flex-col items-center"
            >
              <span className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
                {attr.abbr}
              </span>
              <span className="text-sm font-data font-semibold text-[var(--text-primary)] my-1">
                {current}
                {added > 0 && (
                  <span className="text-[var(--ark-gold-bright)]"> +{added}</span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => decrement(attr.key)}
                  disabled={added <= 0}
                  className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-sm bg-[var(--ark-surface)] border border-[var(--ark-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  −
                </button>
                <button
                  onClick={() => increment(attr.key)}
                  disabled={remaining <= 0}
                  className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-sm bg-[var(--ark-surface)] border border-[var(--ark-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {totalPending > 0 && (
        <ArkButton
          onClick={handleConfirm}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Distribuindo...' : `Confirmar (${totalPending} ponto${totalPending > 1 ? 's' : ''})`}
        </ArkButton>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'

interface MaestriaItem {
  id: string
  name: string
  description: string
  category: string
  essenciaCost: number
  requiresItem: string | null
  minResonanceLevel: number
  locked: boolean
}

interface Props {
  characterId: string
  essencia: number
  prestigioMaestrias: MaestriaItem[]
  ressonanciaMaestrias: MaestriaItem[]
  acquiredIds: string[]
  resonanceArchetype: string | null
}

export default function MaestriaShopSection({
  characterId, essencia: initialEssencia,
  prestigioMaestrias, ressonanciaMaestrias,
  acquiredIds: initialAcquiredIds, resonanceArchetype,
}: Props) {
  const router = useRouter()
  const [acquiredIds, setAcquiredIds] = useState(new Set(initialAcquiredIds))
  const [essencia, setEssencia] = useState(initialEssencia)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAcquire(maestriaId: string, cost: number) {
    setLoadingId(maestriaId)
    setError(null)
    try {
      const res = await fetch('/api/character/maestrias/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, maestria_id: maestriaId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erro ao adquirir Maestria.')
      } else {
        setAcquiredIds((prev) => new Set([...Array.from(prev), maestriaId]))
        setEssencia((prev) => prev - cost)
        router.refresh()
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoadingId(null)
    }
  }

  function renderMaestriaCard(m: MaestriaItem) {
    const owned = acquiredIds.has(m.id)
    const isLoading = loadingId === m.id
    const canAfford = essencia >= m.essenciaCost

    return (
      <div
        key={m.id}
        className={`p-3 rounded-sm border transition-colors ${
          owned
            ? m.category === 'prestígio'
              ? 'border-[var(--ark-gold)]/40 bg-[var(--ark-gold)]/5'
              : 'border-attr-eter/40 bg-attr-eter/5'
            : m.locked
              ? 'border-[var(--ark-border)] opacity-50'
              : 'border-[var(--ark-border)] bg-[var(--ark-bg)]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-data font-semibold text-[var(--text-primary)] truncate">
                {m.name}
              </span>
              {owned && (
                <span className={`text-[9px] font-data ${m.category === 'prestígio' ? 'text-[var(--ark-gold-bright)]' : 'text-attr-eter'}`}>
                  ✓ Adquirida
                </span>
              )}
              {m.locked && !owned && (
                <span className="text-[9px] font-data text-[var(--text-ghost)]">
                  Res. {m.minResonanceLevel} necessário
                </span>
              )}
            </div>
            <p className="text-[10px] font-body text-[var(--text-label)] mt-0.5 line-clamp-2">
              {m.description}
            </p>
          </div>
        </div>

        {!owned && !m.locked && (
          <div className="mt-2">
            {m.requiresItem && (
              <p className="text-[9px] font-data text-[var(--ark-gold)] mb-1">
                Requer: {m.requiresItem}
              </p>
            )}
            <ArkButton
              variant="secondary"
              onClick={() => handleAcquire(m.id, m.essenciaCost)}
              disabled={isLoading || !canAfford}
              className="text-[10px] py-1 px-3"
            >
              {isLoading ? 'Adquirindo...' : `Adquirir — ${m.essenciaCost} Essência`}
            </ArkButton>
            {!canAfford && (
              <p className="text-[10px] font-data text-[var(--text-ghost)] mt-1">
                Essência insuficiente ({essencia}/{m.essenciaCost})
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
          Maestrias
        </h2>
        <span className="text-[10px] font-data text-[var(--text-ghost)]">
          {acquiredIds.size} adquiridas · {essencia} Essências
        </span>
      </div>

      {error && (
        <p className="text-[10px] font-body text-[var(--ark-red-glow)] mb-2">{error}</p>
      )}

      {/* Prestígio */}
      {prestigioMaestrias.length > 0 && (
        <div className="mb-5">
          <p className="text-[9px] font-data text-[var(--ark-red-glow)] uppercase tracking-wider mb-2">
            Classe de Prestígio
          </p>
          <div className="space-y-2">
            {prestigioMaestrias.map(renderMaestriaCard)}
          </div>
        </div>
      )}

      {/* Ressonância */}
      {ressonanciaMaestrias.length > 0 && (
        <div>
          <p className="text-[9px] font-data text-attr-eter uppercase tracking-wider mb-2">
            Ressonância{resonanceArchetype ? ` — ${resonanceArchetype}` : ''}
          </p>
          <div className="space-y-2">
            {ressonanciaMaestrias.map(renderMaestriaCard)}
          </div>
        </div>
      )}

      {prestigioMaestrias.length === 0 && ressonanciaMaestrias.length === 0 && (
        <p className="text-xs font-body text-[var(--text-ghost)] italic">
          Nenhuma Maestria disponível para sua Classe e Ressonância ainda.
        </p>
      )}
    </div>
  )
}

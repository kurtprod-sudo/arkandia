'use client'

import { useState } from 'react'
import ArkModal from '@/components/ui/ArkModal'
import ArkButton from '@/components/ui/ArkButton'

interface AvatarReworkModalProps {
  isOpen: boolean
  onClose: () => void
  characterId: string
  currentPhysicalTraits: string | null
  currentGemas: number
}

const REWORK_COST = 50

export default function AvatarReworkModal({
  isOpen,
  onClose,
  characterId,
  currentPhysicalTraits,
  currentGemas,
}: AvatarReworkModalProps) {
  const [traits, setTraits] = useState(currentPhysicalTraits ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAfford = currentGemas >= REWORK_COST

  const handleRework = async () => {
    if (loading || !canAfford) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/avatar/rework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          physical_traits: traits,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onClose()
        window.location.reload()
      } else {
        setError(data.error ?? 'Erro ao gerar avatar.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ArkModal
      open={isOpen}
      onClose={onClose}
      title="Rework Visual"
      actions={
        <>
          <ArkButton variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </ArkButton>
          <ArkButton
            variant="primary"
            size="sm"
            onClick={handleRework}
            disabled={loading || !canAfford}
          >
            {loading ? 'Forjando imagem...' : 'Gerar novo avatar'}
          </ArkButton>
        </>
      }
    >
      <div className="space-y-4 not-italic">
        <div>
          <label className="block text-[11px] font-semibold tracking-[0.15em] uppercase mb-1.5 text-[var(--text-label)] font-data">
            Caracter&iacute;sticas F&iacute;sicas
          </label>
          <textarea
            value={traits}
            onChange={(e) => setTraits(e.target.value)}
            placeholder="Ex: cabelo branco longo, olhos vermelhos, cicatriz no rosto, compleição atlética..."
            maxLength={300}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[var(--ark-border-bright)] transition-all duration-200 resize-none"
            style={{ fontFamily: 'var(--font-intelo)' }}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-sm bg-[var(--ark-surface)] border border-[var(--ark-border)]">
          <span className="font-data text-xs text-[var(--text-label)] uppercase tracking-wider">
            Custo
          </span>
          <span className="font-data text-sm text-[var(--ark-gold-bright)]">
            {REWORK_COST} Gemas
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-sm bg-[var(--ark-surface)] border border-[var(--ark-border)]">
          <span className="font-data text-xs text-[var(--text-label)] uppercase tracking-wider">
            Seu saldo
          </span>
          <span className={`font-data text-sm ${canAfford ? 'text-[var(--text-secondary)]' : 'text-[var(--ark-red-glow)]'}`}>
            {currentGemas} Gemas
          </span>
        </div>

        {!canAfford && (
          <p className="font-data text-xs text-[var(--ark-red-glow)] text-center">
            Gemas insuficientes.
          </p>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm bg-red-950/40 border border-red-800/50 rounded-sm px-4 py-3">
            <span className="text-red-400">&#x26A0;</span>
            <p className="text-red-300 font-body">{error}</p>
          </div>
        )}
      </div>
    </ArkModal>
  )
}

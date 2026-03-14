'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import ArkModal from '@/components/ui/ArkModal'
import ArkInput from '@/components/ui/ArkInput'

interface SocietyActionsProps {
  characterId: string
  characterLevel: number
  hasSociety: boolean
  myRole: string
  societyId?: string
  joinSocietyId?: string
  showLeaveDissolve?: boolean
}

export default function SocietyActions({
  characterId,
  characterLevel,
  hasSociety,
  myRole,
  societyId,
  joinSocietyId,
  showLeaveDissolve,
}: SocietyActionsProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [manifesto, setManifesto] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/society/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          name: name.trim(),
          description: description.trim(),
          manifesto: manifesto.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCreateOpen(false)
        router.refresh()
      } else {
        setError(data.error ?? 'Erro ao criar.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!joinSocietyId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/society/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, society_id: joinSocietyId }),
      })
      const data = await res.json()
      if (data.success) {
        router.refresh()
      } else {
        setError(data.error ?? 'Erro ao entrar.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/society/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId }),
      })
      const data = await res.json()
      if (data.success) {
        router.refresh()
      } else {
        setError(data.error ?? 'Erro ao sair.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleCollect = async () => {
    if (!societyId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/society/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ society_id: societyId }),
      })
      const data = await res.json()
      if (data.success) {
        router.refresh()
      } else {
        setError(data.error ?? 'Erro ao coletar.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount, 10)
    if (!amount || amount <= 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/society/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, amount }),
      })
      const data = await res.json()
      if (data.success) {
        setDepositOpen(false)
        setDepositAmount('')
        router.refresh()
      } else {
        setError(data.error ?? 'Erro ao depositar.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  // Without society — show create and/or join buttons
  if (!hasSociety) {
    return (
      <>
        {error && <p className="text-xs text-[var(--ark-red-glow)] font-body mb-2">{error}</p>}

        {joinSocietyId ? (
          <ArkButton size="sm" onClick={handleJoin} disabled={loading}>
            {loading ? 'Entrando…' : 'Ingressar'}
          </ArkButton>
        ) : (
          <div className="space-y-3">
            {characterLevel >= 10 ? (
              <ArkButton onClick={() => setCreateOpen(true)}>
                Fundar Sociedade
              </ArkButton>
            ) : (
              <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)] text-center">
                <p className="text-sm text-[var(--text-secondary)] font-body mb-2">
                  Você não pertence a nenhuma Sociedade.
                </p>
                <p className="text-xs text-[var(--text-ghost)] font-data">
                  Nível 10 necessário para fundar uma Sociedade.
                </p>
              </div>
            )}
          </div>
        )}

        <ArkModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Fundar Sociedade"
          actions={
            <>
              <ArkButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                Cancelar
              </ArkButton>
              <ArkButton size="sm" onClick={handleCreate} disabled={loading || !name.trim() || !description.trim()}>
                {loading ? 'Fundando…' : 'Fundar (500 Libras)'}
              </ArkButton>
            </>
          }
        >
          <div className="space-y-4 not-italic">
            {error && <p className="text-xs text-[var(--ark-red-glow)]">{error}</p>}
            <ArkInput
              label="Nome da Sociedade"
              id="society-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
            <div>
              <label
                className="block text-[11px] font-semibold tracking-[0.15em] uppercase mb-1.5 text-[var(--text-label)]"
                style={{ fontFamily: 'var(--font-intelo)' }}
                htmlFor="society-desc"
              >
                Descrição
              </label>
              <textarea
                id="society-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[var(--ark-border-bright)] transition-all duration-200 resize-none"
                style={{ fontFamily: 'var(--font-intelo)' }}
              />
            </div>
            <ArkInput
              label="Manifesto (opcional)"
              id="society-manifesto"
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              maxLength={200}
              placeholder="Lema ou ideal da Sociedade"
            />
          </div>
        </ArkModal>
      </>
    )
  }

  // With society — show collect / deposit / leave / dissolve
  if (showLeaveDissolve) {
    return (
      <>
        {error && <p className="text-xs text-[var(--ark-red-glow)] font-body mb-2">{error}</p>}
        {myRole !== 'leader' && (
          <ArkButton variant="ghost" size="sm" onClick={handleLeave} disabled={loading}>
            {loading ? 'Saindo…' : 'Sair da Sociedade'}
          </ArkButton>
        )}
      </>
    )
  }

  // In-society panel actions (collect / deposit)
  return (
    <div className="flex items-center gap-3 mt-4">
      {error && <p className="text-xs text-[var(--ark-red-glow)] font-body">{error}</p>}
      {(myRole === 'leader' || myRole === 'officer') && (
        <ArkButton size="sm" onClick={handleCollect} disabled={loading}>
          {loading ? 'Coletando…' : 'Coletar Produção'}
        </ArkButton>
      )}
      <ArkButton variant="secondary" size="sm" onClick={() => setDepositOpen(true)}>
        Depositar no Cofre
      </ArkButton>

      <ArkModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        title="Depositar no Cofre"
        actions={
          <>
            <ArkButton variant="ghost" size="sm" onClick={() => setDepositOpen(false)}>
              Cancelar
            </ArkButton>
            <ArkButton size="sm" onClick={handleDeposit} disabled={loading || !depositAmount}>
              {loading ? 'Depositando…' : 'Depositar'}
            </ArkButton>
          </>
        }
      >
        <div className="not-italic">
          <ArkInput
            label="Quantidade de Libras"
            id="deposit-amount"
            type="number"
            min={1}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
        </div>
      </ArkModal>
    </div>
  )
}

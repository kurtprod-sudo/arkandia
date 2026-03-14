'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'

const TROOP_LABELS: Record<string, string> = {
  infantaria: 'Infantaria',
  cavalaria: 'Cavalaria',
  arquearia: 'Arquearia',
  cerco: 'Cerco',
}

interface WarPanelProps {
  warId: string
  war: {
    status: string
    phase: number
    preparationEnds: string
    finishedAt: string | null
    winnerId: string | null
    attackerId: string
    defenderId: string | null
  }
  attackerName: string
  defenderName: string
  territoryName: string
  battles: Array<{
    id: string
    phase: number
    attackerPower: number
    defenderPower: number
    winnerSide: string | null
    narrativeText: string | null
  }>
  participants: Array<{
    name: string
    level: number
    side: string
    troopsCommitted: Record<string, number>
  }>
  myCharacter: {
    id: string
    societyId: string | null
  }
  myTroops: Array<{
    troopType: string
    quantity: number
  }>
  isParticipant: boolean
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'preparation':
      return <ArkBadge color="gold">Preparação</ArkBadge>
    case 'active':
      return <ArkBadge color="crimson">Ativa</ArkBadge>
    case 'finished':
      return <ArkBadge color="bronze">Encerrada</ArkBadge>
    case 'cancelled':
      return <ArkBadge color="dead">Cancelada</ArkBadge>
    default:
      return <ArkBadge color="bronze">{status}</ArkBadge>
  }
}

export default function WarPanel({
  warId,
  war,
  attackerName,
  defenderName,
  territoryName,
  battles,
  participants,
  myCharacter,
  myTroops,
  isParticipant,
}: WarPanelProps) {
  const router = useRouter()
  const [commitQty, setCommitQty] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')

  // Countdown for preparation phase
  useEffect(() => {
    if (war.status !== 'preparation') return

    const target = new Date(war.preparationEnds).getTime()
    const interval = setInterval(() => {
      const now = Date.now()
      const diff = target - now
      if (diff <= 0) {
        setCountdown('Preparação encerrada')
        clearInterval(interval)
        return
      }
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
      setCountdown(`${h}h ${m}m ${s}s`)
    }, 1000)

    return () => clearInterval(interval)
  }, [war.status, war.preparationEnds])

  const handleCommit = async () => {
    const troops: Record<string, number> = {}
    for (const [type, qty] of Object.entries(commitQty)) {
      if (qty > 0) troops[type] = qty
    }
    if (Object.keys(troops).length === 0) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/war/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          war_id: warId,
          character_id: myCharacter.id,
          troops,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCommitQty({})
        router.refresh()
      } else {
        setError(data.error ?? 'Erro ao comprometer tropas.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const attackerParticipants = participants.filter((p) => p.side === 'attacker')
  const defenderParticipants = participants.filter((p) => p.side === 'defender')

  return (
    <div className="space-y-6">
      {/* Section 1 — War Header */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <div className="flex items-center justify-between mb-4">
          <StatusBadge status={war.status} />
          <span className="font-data text-xs text-[var(--text-ghost)]">
            Fase {war.phase}
          </span>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="font-display text-lg font-bold text-[var(--ark-red-glow)]">
              {attackerName}
            </p>
            <p className="text-[10px] font-data text-[var(--text-ghost)] uppercase tracking-wider">
              Atacante
            </p>
          </div>
          <span className="font-display text-2xl text-[var(--text-ghost)]">vs</span>
          <div className="text-center">
            <p className="font-display text-lg font-bold text-[var(--text-secondary)]">
              {defenderName}
            </p>
            <p className="text-[10px] font-data text-[var(--text-ghost)] uppercase tracking-wider">
              Defensor
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-label)] font-data mt-3">
          Território: {territoryName}
        </p>
      </div>

      {/* Section 2 — Preparation Countdown */}
      {war.status === 'preparation' && (
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)] text-center">
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">
            Fase de Preparação — Posicione suas tropas
          </p>
          <p className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {countdown}
          </p>
        </div>
      )}

      {/* Section 3 — Commit Troops */}
      {isParticipant && ['preparation', 'active'].includes(war.status) && (
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
            Comprometer Tropas
          </p>

          {error && <p className="text-xs text-[var(--ark-red-glow)] font-body mb-3">{error}</p>}

          {myTroops.length === 0 ? (
            <p className="text-xs text-[var(--text-ghost)] font-body italic">
              Sua Sociedade não possui tropas. Recrute no painel da Sociedade.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {myTroops.map((t) => (
                  <div key={t.troopType} className="space-y-1.5">
                    <p className="font-data text-xs text-[var(--text-secondary)]">
                      {TROOP_LABELS[t.troopType] ?? t.troopType}
                    </p>
                    <p className="text-[10px] font-data text-[var(--text-ghost)]">
                      Disponíveis: {t.quantity}
                    </p>
                    <input
                      type="number"
                      min={0}
                      max={t.quantity}
                      value={commitQty[t.troopType] ?? 0}
                      onChange={(e) =>
                        setCommitQty((prev) => ({
                          ...prev,
                          [t.troopType]: Math.min(
                            parseInt(e.target.value, 10) || 0,
                            t.quantity
                          ),
                        }))
                      }
                      className="w-full px-2 py-1.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm font-data focus:outline-none focus:border-[var(--ark-border-bright)] transition-all duration-200"
                    />
                  </div>
                ))}
              </div>
              <ArkButton
                size="sm"
                onClick={handleCommit}
                disabled={loading || Object.values(commitQty).every((v) => !v)}
              >
                {loading ? 'Comprometendo…' : 'Comprometer Tropas'}
              </ArkButton>
            </>
          )}
        </div>
      )}

      {/* Section 4 — Battle History */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
          Histórico de Batalhas ({battles.length})
        </p>

        {battles.length === 0 ? (
          <p className="text-xs text-[var(--text-ghost)] font-body italic">
            Nenhuma batalha resolvida.
          </p>
        ) : (
          <div className="space-y-3">
            {battles.map((b) => (
              <div
                key={b.id}
                className="py-3 border-b border-[var(--ark-border)] last:border-0"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-data text-xs text-[var(--text-label)]">
                    Fase {b.phase}
                  </span>
                  {b.winnerSide === 'attacker' ? (
                    <ArkBadge color="crimson">Atacantes</ArkBadge>
                  ) : b.winnerSide === 'defender' ? (
                    <ArkBadge color="bronze">Defensores</ArkBadge>
                  ) : (
                    <ArkBadge color="bronze">Empate</ArkBadge>
                  )}
                </div>
                <div className="flex items-center gap-4 mb-1.5">
                  <span className="font-data text-xs text-[var(--ark-red-glow)]">
                    Poder: {b.attackerPower}
                  </span>
                  <span className="text-[var(--text-ghost)] text-xs">vs</span>
                  <span className="font-data text-xs text-[var(--text-secondary)]">
                    Poder: {b.defenderPower}
                  </span>
                </div>
                {b.narrativeText && (
                  <p className="text-xs text-[var(--text-secondary)] font-body italic">
                    {b.narrativeText}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5 — Participants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attackers */}
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
          <p className="text-[10px] font-data text-[var(--ark-red-glow)] uppercase tracking-wider mb-3">
            Atacantes ({attackerParticipants.length})
          </p>
          {attackerParticipants.length === 0 ? (
            <p className="text-xs text-[var(--text-ghost)] font-body italic">
              Nenhum participante.
            </p>
          ) : (
            <div className="space-y-2">
              {attackerParticipants.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div>
                    <p className="font-data text-xs text-[var(--text-secondary)]">
                      {p.name}
                    </p>
                    <p className="text-[9px] font-data text-[var(--text-ghost)]">
                      Nv {p.level}
                    </p>
                  </div>
                  <div className="text-right">
                    {Object.entries(p.troopsCommitted).map(([type, qty]) =>
                      qty > 0 ? (
                        <p key={type} className="text-[9px] font-data text-[var(--text-ghost)]">
                          {TROOP_LABELS[type] ?? type}: {qty}
                        </p>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Defenders */}
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
          <p className="text-[10px] font-data text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Defensores ({defenderParticipants.length})
          </p>
          {defenderParticipants.length === 0 ? (
            <p className="text-xs text-[var(--text-ghost)] font-body italic">
              Nenhum participante.
            </p>
          ) : (
            <div className="space-y-2">
              {defenderParticipants.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div>
                    <p className="font-data text-xs text-[var(--text-secondary)]">
                      {p.name}
                    </p>
                    <p className="text-[9px] font-data text-[var(--text-ghost)]">
                      Nv {p.level}
                    </p>
                  </div>
                  <div className="text-right">
                    {Object.entries(p.troopsCommitted).map(([type, qty]) =>
                      qty > 0 ? (
                        <p key={type} className="text-[9px] font-data text-[var(--text-ghost)]">
                          {TROOP_LABELS[type] ?? type}: {qty}
                        </p>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* War Result */}
      {war.status === 'finished' && (
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)] text-center">
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">
            Resultado Final
          </p>
          <p className="font-display text-lg font-bold text-[var(--text-primary)]">
            {war.winnerId === war.attackerId
              ? `${attackerName} conquista ${territoryName}`
              : `${defenderName} mantém ${territoryName}`}
          </p>
        </div>
      )}
    </div>
  )
}

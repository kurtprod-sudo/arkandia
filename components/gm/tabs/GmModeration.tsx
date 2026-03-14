'use client'

import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import { gmResolveBattle, gmForceAuction, gmUpdateRankings } from '@/app/gm/actions'
import type { GameEvent } from '@/types'

interface Props {
  events: GameEvent[]
}

const MOD_EVENT_TYPES = [
  'title_granted', 'payment_approved', 'society_founded',
  'society_dissolved', 'war_declared', 'war_finished',
]

export default function GmModeration({ events }: Props) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [warId, setWarId] = useState('')
  const [auctionId, setAuctionId] = useState('')
  const [filterType, setFilterType] = useState('')

  const modEvents = events.filter((e) =>
    filterType ? e.type === filterType : MOD_EVENT_TYPES.includes(e.type)
  )

  async function runAction(fn: () => Promise<{ success?: boolean; error?: string }>) {
    setLoading(true)
    setMsg('')
    try {
      const result = await fn()
      setMsg(result.error ?? 'OK')
    } catch (err) {
      setMsg(String(err))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {msg && <p className={`text-xs font-data ${msg === 'OK' ? 'text-status-alive' : 'text-[var(--ark-red-glow)]'}`}>{msg}</p>}

      {/* Force actions */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Forcar Acoes</h4>

        <div className="flex items-center gap-2">
          <span className="text-xs font-data text-[var(--text-label)] w-32 shrink-0">Resolver Batalha</span>
          <input
            value={warId}
            onChange={(e) => setWarId(e.target.value)}
            placeholder="war_id (UUID)"
            className="flex-1 px-2 py-1 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"
          />
          <ArkButton size="sm" disabled={loading || !warId} onClick={() => runAction(() => gmResolveBattle(warId))}>
            Resolver
          </ArkButton>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-data text-[var(--text-label)] w-32 shrink-0">Finalizar Leilao</span>
          <input
            value={auctionId}
            onChange={(e) => setAuctionId(e.target.value)}
            placeholder="auction_id (UUID)"
            className="flex-1 px-2 py-1 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"
          />
          <ArkButton size="sm" disabled={loading || !auctionId} onClick={() => runAction(() => gmForceAuction(auctionId))}>
            Finalizar
          </ArkButton>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-data text-[var(--text-label)] w-32 shrink-0">Rankings</span>
          <ArkButton size="sm" disabled={loading} onClick={() => runAction(gmUpdateRankings)}>
            Atualizar Rankings
          </ArkButton>
        </div>
      </div>

      {/* Ban/silence placeholder */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Banir / Silenciar</h4>
        <p className="text-sm font-body text-[var(--text-ghost)] italic">Em breve — Fase 20.</p>
      </div>

      {/* Moderation log */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Logs de Moderacao</h4>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1 text-[10px] bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data"
          >
            <option value="">Todos</option>
            {MOD_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {modEvents.slice(0, 20).map((event) => (
            <div key={event.id} className="flex items-start gap-2 text-xs border-b border-[var(--ark-border)]/50 pb-2 last:border-0">
              <ArkBadge color="crimson" className="text-[9px] shrink-0 mt-0.5">
                {event.type.replace(/_/g, ' ')}
              </ArkBadge>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-secondary)] font-body truncate">
                  {event.narrative_text ?? JSON.stringify(event.metadata).slice(0, 80)}
                </p>
                <p className="text-[var(--text-ghost)] text-[10px] font-data">
                  {new Date(event.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {modEvents.length === 0 && (
            <p className="text-[var(--text-label)] text-sm font-body italic">Nenhum evento de moderacao.</p>
          )}
        </div>
      </div>
    </div>
  )
}

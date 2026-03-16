'use client'

import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import {
  gmResolveBattle, gmForceAuction, gmUpdateRankings,
  gmBanUser, gmUnbanUser, gmSilenceUser, gmUnsilenceUser,
} from '@/app/gm/actions'
import type { GameEvent } from '@/types'

interface Props {
  events: GameEvent[]
  moderationLogs: Array<{
    id: string
    action: string
    reason: string
    duration_hours: number | null
    created_at: string
    target_user_id: string
  }>
}

const MOD_EVENT_TYPES = [
  'title_granted', 'payment_approved', 'society_founded',
  'society_dissolved', 'war_declared', 'war_finished',
]

const DURATION_OPTIONS = [
  { label: '1 hora', value: 1 },
  { label: '6 horas', value: 6 },
  { label: '24 horas', value: 24 },
  { label: '3 dias', value: 72 },
  { label: '7 dias', value: 168 },
  { label: '30 dias', value: 720 },
  { label: 'Permanente', value: -1 },
]

const ACTION_BADGES: Record<string, 'crimson' | 'alive' | 'injured'> = {
  ban: 'crimson',
  unban: 'alive',
  silence: 'injured',
  unsilence: 'alive',
  warn: 'injured',
}

export default function GmModeration({ events, moderationLogs = [] }: Props) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [warId, setWarId] = useState('')
  const [auctionId, setAuctionId] = useState('')
  const [filterType, setFilterType] = useState('')

  // Ban form
  const [banTarget, setBanTarget] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState(24)

  // Silence form
  const [silenceTarget, setSilenceTarget] = useState('')
  const [silenceReason, setSilenceReason] = useState('')
  const [silenceDuration, setSilenceDuration] = useState(6)

  // Unban/unsilence
  const [removeTarget, setRemoveTarget] = useState('')

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

      {/* Ban User */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Banir Usuário</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={banTarget}
            onChange={(e) => setBanTarget(e.target.value)}
            placeholder="User ID (UUID)"
            className="px-2 py-1.5 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"
          />
          <select
            value={banDuration}
            onChange={(e) => setBanDuration(Number(e.target.value))}
            className="px-2 py-1.5 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <input
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          placeholder="Motivo (obrigatório)"
          className="w-full px-2 py-1.5 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"
        />
        <ArkButton
          variant="danger"
          size="sm"
          disabled={loading || !banTarget || !banReason}
          onClick={() => runAction(() =>
            gmBanUser(banTarget, banReason, banDuration === -1 ? null : banDuration)
          )}
        >
          Banir
        </ArkButton>
      </div>

      {/* Silence User */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Silenciar em Cenários</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={silenceTarget}
            onChange={(e) => setSilenceTarget(e.target.value)}
            placeholder="User ID (UUID)"
            className="px-2 py-1.5 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"
          />
          <select
            value={silenceDuration}
            onChange={(e) => setSilenceDuration(Number(e.target.value))}
            className="px-2 py-1.5 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data"
          >
            {DURATION_OPTIONS.filter((d) => d.value !== -1 && d.value <= 72).map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <input
          value={silenceReason}
          onChange={(e) => setSilenceReason(e.target.value)}
          placeholder="Motivo (obrigatório)"
          className="w-full px-2 py-1.5 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"
        />
        <ArkButton
          size="sm"
          disabled={loading || !silenceTarget || !silenceReason}
          onClick={() => runAction(() =>
            gmSilenceUser(silenceTarget, silenceReason, silenceDuration)
          )}
        >
          Silenciar
        </ArkButton>
      </div>

      {/* Remove Punishment */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Remover Punição</h4>
        <input
          value={removeTarget}
          onChange={(e) => setRemoveTarget(e.target.value)}
          placeholder="User ID (UUID)"
          className="w-full px-2 py-1.5 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"
        />
        <div className="flex gap-2">
          <ArkButton
            variant="secondary"
            size="sm"
            disabled={loading || !removeTarget}
            onClick={() => runAction(() => gmUnbanUser(removeTarget, 'Removido pelo GM'))}
          >
            Remover Ban
          </ArkButton>
          <ArkButton
            variant="secondary"
            size="sm"
            disabled={loading || !removeTarget}
            onClick={() => runAction(() => gmUnsilenceUser(removeTarget, 'Removido pelo GM'))}
          >
            Remover Silêncio
          </ArkButton>
        </div>
      </div>

      {/* Force actions */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Forçar Ações</h4>
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
          <span className="text-xs font-data text-[var(--text-label)] w-32 shrink-0">Finalizar Leilão</span>
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

      {/* Moderation Log */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Log de Moderação</h4>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {moderationLogs.length > 0 ? (
            moderationLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-xs border-b border-[var(--ark-border)]/50 pb-2 last:border-0">
                <ArkBadge color={ACTION_BADGES[log.action] ?? 'bronze'} className="text-[9px] shrink-0 mt-0.5">
                  {log.action}
                </ArkBadge>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-secondary)] font-body truncate">{log.reason}</p>
                  <p className="text-[var(--text-ghost)] text-[10px] font-data">
                    {log.target_user_id.slice(0, 8)}... · {log.duration_hours ? `${log.duration_hours}h` : 'permanente'} · {new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[var(--text-label)] text-sm font-body italic">Nenhum registro de moderação.</p>
          )}
        </div>
      </div>

      {/* Event log */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Logs de Eventos</h4>
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
            <p className="text-[var(--text-label)] text-sm font-body italic">Nenhum evento de moderação.</p>
          )}
        </div>
      </div>
    </div>
  )
}

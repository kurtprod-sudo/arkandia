'use client'

import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import {
  gmCreateTournamentAction,
  gmGenerateBracketAction,
  gmAdvanceBracketAction,
  gmFinishTournamentAction,
} from '@/app/actions/tournament'

interface TournamentData {
  id: string
  name: string
  status: string
  max_participants: number
  participantCount: number
  matches: Array<{
    id: string
    round: number
    match_number: number
    status: string
    is_bye: boolean
    participant_a_name: string | null
    participant_b_name: string | null
  }>
}

interface Props {
  tournaments: TournamentData[]
}

const STATUS_COLORS: Record<string, 'alive' | 'injured' | 'crimson' | 'gold' | 'bronze'> = {
  open: 'alive', bracket_generated: 'gold', in_progress: 'crimson', finished: 'bronze',
}

export default function GmTournaments({ tournaments }: Props) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Create form
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [maxP, setMaxP] = useState<8 | 16 | 32>(8)
  const [regEnds, setRegEnds] = useState('')
  const [p1Libras, setP1Libras] = useState(0)
  const [p1Gemas, setP1Gemas] = useState(0)
  const [p2Libras, setP2Libras] = useState(0)
  const [p2Gemas, setP2Gemas] = useState(0)
  const [p3Libras, setP3Libras] = useState(0)
  const [p3Gemas, setP3Gemas] = useState(0)

  async function run(fn: () => Promise<{ success?: boolean; error?: string }>) {
    setLoading(true); setMsg('')
    try { const r = await fn(); setMsg(r.error ?? 'OK') }
    catch (e) { setMsg(String(e)) }
    setLoading(false)
  }

  const inputCls = "px-2 py-1.5 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"

  return (
    <div className="space-y-6">
      {msg && <p className={`text-xs font-data ${msg === 'OK' ? 'text-status-alive' : 'text-[var(--ark-red-glow)]'}`}>{msg}</p>}

      {/* Create */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Criar Torneio</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className={inputCls} />
          <select value={maxP} onChange={(e) => setMaxP(Number(e.target.value) as 8 | 16 | 32)} className={inputCls}>
            <option value={8}>8 jogadores</option>
            <option value={16}>16 jogadores</option>
            <option value={32}>32 jogadores</option>
          </select>
        </div>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (opcional)" className={`w-full ${inputCls}`} />
        <input type="datetime-local" value={regEnds} onChange={(e) => setRegEnds(e.target.value)} className={`w-full ${inputCls}`} />
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '1º', l: p1Libras, sl: setP1Libras, g: p1Gemas, sg: setP1Gemas },
            { label: '2º', l: p2Libras, sl: setP2Libras, g: p2Gemas, sg: setP2Gemas },
            { label: '3º', l: p3Libras, sl: setP3Libras, g: p3Gemas, sg: setP3Gemas },
          ].map((p) => (
            <div key={p.label} className="space-y-1">
              <span className="text-[10px] font-data text-[var(--text-label)]">{p.label}</span>
              <input type="number" value={p.l} onChange={(e) => p.sl(Number(e.target.value))} placeholder="Libras" className={`w-full ${inputCls}`} />
              <input type="number" value={p.g} onChange={(e) => p.sg(Number(e.target.value))} placeholder="Gemas" className={`w-full ${inputCls}`} />
            </div>
          ))}
        </div>
        <ArkButton size="sm" disabled={loading || !name || !regEnds} onClick={() => run(() =>
          gmCreateTournamentAction({
            name, description: desc || undefined, maxParticipants: maxP,
            registrationEndsAt: new Date(regEnds).toISOString(),
            prizePool: {
              first: { libras: p1Libras, gemas: p1Gemas },
              second: { libras: p2Libras, gemas: p2Gemas },
              third: { libras: p3Libras, gemas: p3Gemas },
            },
          })
        )}>
          Criar Torneio
        </ArkButton>
      </div>

      {/* Active tournaments */}
      {tournaments.map((t) => (
        <div key={t.id} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-data font-semibold text-[var(--text-primary)]">{t.name}</h4>
            <ArkBadge color={STATUS_COLORS[t.status] ?? 'bronze'} className="text-[9px]">{t.status}</ArkBadge>
          </div>
          <p className="text-[10px] font-data text-[var(--text-label)]">{t.participantCount}/{t.max_participants} participantes</p>

          {/* Actions by status */}
          {t.status === 'open' && (
            <ArkButton size="sm" disabled={loading} onClick={() => run(() => gmGenerateBracketAction(t.id))}>
              Fechar inscrições e gerar bracket
            </ArkButton>
          )}

          {(t.status === 'bracket_generated' || t.status === 'in_progress') && (
            <div className="space-y-2">
              <p className="text-[10px] font-data text-[var(--text-label)] uppercase">Confrontos pendentes</p>
              {t.matches.filter((m) => m.status === 'pending' && !m.is_bye).map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                  <span className="text-xs font-data text-[var(--text-secondary)]">
                    R{m.round} #{m.match_number}: {m.participant_a_name ?? '?'} vs {m.participant_b_name ?? '?'}
                  </span>
                  <ArkButton size="sm" disabled={loading} onClick={() => run(() => gmAdvanceBracketAction(m.id))}>
                    Convocar
                  </ArkButton>
                </div>
              ))}

              {/* Finish button if all final matches done */}
              {t.matches.every((m) => m.status === 'finished' || m.is_bye) && (
                <ArkButton variant="primary" size="sm" disabled={loading} onClick={() => run(() => gmFinishTournamentAction(t.id))}>
                  Finalizar torneio e distribuir prêmios
                </ArkButton>
              )}
            </div>
          )}
        </div>
      ))}

      {tournaments.length === 0 && (
        <p className="text-xs font-body text-[var(--text-label)] italic">Nenhum torneio criado.</p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import { gmCreateWorldEventAction, gmEndWorldEventAction } from '@/app/actions/world_events'

const EVENT_TYPES = [
  'monolito', 'invasao_faccao', 'passagem_imperador',
  'torneio', 'crise_politica', 'catalogo_lendario',
] as const

interface ActiveEvent {
  id: string; type: string; title: string; status: string; created_at: string
}

export default function GmWorldEvents({ activeEvents }: { activeEvents: ActiveEvent[] }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [type, setType] = useState<string>('monolito')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  // Metadata fields
  const [factionSlug, setFactionSlug] = useState('')
  const [repBonus, setRepBonus] = useState(0)
  const [zoneName, setZoneName] = useState('')
  const [zoneSlug, setZoneSlug] = useState('')
  const [zoneMinLevel, setZoneMinLevel] = useState(1)
  const [emperorName, setEmperorName] = useState('')
  const [region, setRegion] = useState('')
  const [tournamentId, setTournamentId] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [factionDeltas, setFactionDeltas] = useState<Array<{ slug: string; delta: number }>>([{ slug: '', delta: 0 }])

  const inputCls = "px-2 py-1.5 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data focus:border-[var(--ark-border-bright)] focus:outline-none"

  async function handleCreate() {
    setLoading(true); setMsg('')
    let metadata: Record<string, unknown> = {}
    if (type === 'monolito') metadata = { faction_slug: factionSlug, reputation_bonus: repBonus }
    if (type === 'invasao_faccao') metadata = { faction_slug: factionSlug, zone_name: zoneName, zone_slug: zoneSlug, zone_min_level: zoneMinLevel }
    if (type === 'passagem_imperador') metadata = { emperor_name: emperorName, region }
    if (type === 'torneio') metadata = { tournament_id: tournamentId }
    if (type === 'crise_politica') {
      const deltas: Record<string, number> = {}
      factionDeltas.forEach((d) => { if (d.slug) deltas[d.slug] = d.delta })
      metadata = { faction_deltas: deltas }
    }
    if (type === 'catalogo_lendario') metadata = { season_id: seasonId }
    const r = await gmCreateWorldEventAction({ type: type as typeof EVENT_TYPES[number], title, description: desc, metadata })
    setMsg(r.error ?? 'OK')
    setLoading(false)
  }

  async function handleEnd(eventId: string) {
    setLoading(true); setMsg('')
    const r = await gmEndWorldEventAction(eventId)
    setMsg(r.error ?? 'OK')
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {msg && <p className={`text-xs font-data ${msg === 'OK' ? 'text-status-alive' : 'text-[var(--ark-red-glow)]'}`}>{msg}</p>}

      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Criar Evento</h4>
        <select value={type} onChange={(e) => setType(e.target.value)} className={`w-full ${inputCls}`}>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className={`w-full ${inputCls}`} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" rows={2} className={`w-full ${inputCls}`} />

        {(type === 'monolito' || type === 'invasao_faccao') && (
          <input value={factionSlug} onChange={(e) => setFactionSlug(e.target.value)} placeholder="faction_slug" className={`w-full ${inputCls}`} />
        )}
        {type === 'monolito' && (
          <input type="number" value={repBonus} onChange={(e) => setRepBonus(Number(e.target.value))} placeholder="reputation_bonus" className={`w-full ${inputCls}`} />
        )}
        {type === 'invasao_faccao' && (
          <div className="grid grid-cols-3 gap-2">
            <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="zone_name" className={inputCls} />
            <input value={zoneSlug} onChange={(e) => setZoneSlug(e.target.value)} placeholder="zone_slug" className={inputCls} />
            <input type="number" value={zoneMinLevel} onChange={(e) => setZoneMinLevel(Number(e.target.value))} placeholder="min_level" className={inputCls} />
          </div>
        )}
        {type === 'passagem_imperador' && (
          <div className="grid grid-cols-2 gap-2">
            <input value={emperorName} onChange={(e) => setEmperorName(e.target.value)} placeholder="emperor_name" className={inputCls} />
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="region" className={inputCls} />
          </div>
        )}
        {type === 'torneio' && <input value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} placeholder="tournament_id" className={`w-full ${inputCls}`} />}
        {type === 'catalogo_lendario' && <input value={seasonId} onChange={(e) => setSeasonId(e.target.value)} placeholder="season_id" className={`w-full ${inputCls}`} />}
        {type === 'crise_politica' && (
          <div className="space-y-1">
            {factionDeltas.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input value={d.slug} onChange={(e) => { const n = [...factionDeltas]; n[i].slug = e.target.value; setFactionDeltas(n) }} placeholder="faction_slug" className={`flex-1 ${inputCls}`} />
                <input type="number" value={d.delta} onChange={(e) => { const n = [...factionDeltas]; n[i].delta = Number(e.target.value); setFactionDeltas(n) }} placeholder="delta" className={`w-24 ${inputCls}`} />
              </div>
            ))}
            <button onClick={() => setFactionDeltas([...factionDeltas, { slug: '', delta: 0 }])} className="text-[10px] font-data text-[var(--text-label)]">+ Adicionar facção</button>
          </div>
        )}

        <ArkButton size="sm" disabled={loading || !title} onClick={handleCreate}>Criar Evento</ArkButton>
      </div>

      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
        <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Eventos Ativos</h4>
        {activeEvents.length > 0 ? (
          <div className="space-y-2">
            {activeEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-2 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                <div className="flex items-center gap-2">
                  <ArkBadge color="alive" className="text-[8px]">{e.type}</ArkBadge>
                  <span className="text-xs font-data text-[var(--text-primary)]">{e.title}</span>
                </div>
                <ArkButton variant="danger" size="sm" disabled={loading} onClick={() => handleEnd(e.id)}>Encerrar</ArkButton>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-body text-[var(--text-label)] italic">Nenhum evento ativo.</p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import {
  gmGenerateJournal, gmPublishJournal, gmArchiveJournal,
  gmCloseScenario, gmCreateScenario, gmConfirmLore,
} from '@/app/gm/actions'

interface Props {
  journalEditions: Array<{ id: string; edition_date: string; status: string; published_at: string | null }>
  allScenarios: Array<{ id: string; name: string; location: string; is_active: boolean; scenario_presence: Array<{ count: number }> }>
  unconfirmedLore: Array<{ id: string; title: string; character_id: string; characters: { name: string } | null }>
}

export default function GmNarrative({ journalEditions, allScenarios, unconfirmedLore }: Props) {
  const [section, setSection] = useState<'journal' | 'scenarios' | 'lore'>('journal')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Scenario form
  const [scName, setScName] = useState('')
  const [scLocation, setScLocation] = useState('')
  const [scDesc, setScDesc] = useState('')
  const [scMaxPlayers, setScMaxPlayers] = useState('10')

  // Lore confirm
  const [gmCharId, setGmCharId] = useState('')

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

  const sections = [
    { key: 'journal' as const, label: 'Jornal' },
    { key: 'scenarios' as const, label: 'Cenarios' },
    { key: 'lore' as const, label: 'Lore do Diario' },
  ]

  const JOURNAL_STATUS_COLOR: Record<string, 'alive' | 'injured' | 'crimson'> = {
    draft: 'injured',
    published: 'alive',
    archived: 'crimson',
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => { setSection(s.key); setMsg('') }}
            className={`px-3 py-1.5 text-xs font-data uppercase tracking-wider rounded-sm transition-colors ${
              section === s.key
                ? 'bg-[var(--ark-red)]/30 text-[var(--ark-red-glow)] border border-[var(--ark-border-bright)]'
                : 'text-[var(--text-label)] border border-[var(--ark-border)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {msg && <p className={`text-xs font-data ${msg === 'OK' ? 'text-status-alive' : 'text-[var(--ark-red-glow)]'}`}>{msg}</p>}

      {/* Journal */}
      {section === 'journal' && (
        <div className="space-y-3">
          <ArkButton size="sm" disabled={loading} onClick={() => runAction(gmGenerateJournal)}>
            Gerar Edicao
          </ArkButton>

          {journalEditions.map((ed) => (
            <div key={ed.id} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 flex items-center justify-between">
              <div>
                <span className="font-data text-sm text-[var(--text-primary)]">{ed.edition_date}</span>
                <ArkBadge color={JOURNAL_STATUS_COLOR[ed.status] ?? 'crimson'} className="text-[9px] ml-2">
                  {ed.status}
                </ArkBadge>
                {ed.published_at && (
                  <span className="text-[var(--text-ghost)] text-xs font-data ml-2">
                    Publicado: {new Date(ed.published_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {ed.status === 'draft' && (
                  <ArkButton size="sm" disabled={loading} onClick={() => runAction(() => gmPublishJournal(ed.id))}>
                    Publicar
                  </ArkButton>
                )}
                {ed.status !== 'archived' && (
                  <ArkButton size="sm" variant="ghost" disabled={loading} onClick={() => runAction(() => gmArchiveJournal(ed.id))}>
                    Arquivar
                  </ArkButton>
                )}
              </div>
            </div>
          ))}
          {journalEditions.length === 0 && (
            <p className="text-[var(--text-label)] text-sm font-body italic">Nenhuma edicao encontrada.</p>
          )}
        </div>
      )}

      {/* Scenarios */}
      {section === 'scenarios' && (
        <div className="space-y-3">
          {/* Create form */}
          <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-2">
            <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Criar Cenario</h4>
            <div className="grid grid-cols-2 gap-2">
              <input value={scName} onChange={(e) => setScName(e.target.value)} placeholder="Nome" className="input-sm" />
              <input value={scLocation} onChange={(e) => setScLocation(e.target.value)} placeholder="Localizacao" className="input-sm" />
            </div>
            <input value={scDesc} onChange={(e) => setScDesc(e.target.value)} placeholder="Descricao" className="input-sm w-full" />
            <div className="flex items-center gap-2">
              <input type="number" value={scMaxPlayers} onChange={(e) => setScMaxPlayers(e.target.value)} placeholder="Max jogadores" className="input-sm w-24" min="2" />
              <ArkButton size="sm" disabled={loading || !scName || !scLocation} onClick={() => runAction(() => gmCreateScenario({ name: scName, description: scDesc, location: scLocation, maxPlayers: Number(scMaxPlayers) }))}>
                Criar
              </ArkButton>
            </div>
          </div>

          {/* List */}
          {allScenarios.map((sc) => {
            const presence = sc.scenario_presence?.[0]?.count ?? 0
            return (
              <div key={sc.id} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 flex items-center justify-between">
                <div>
                  <span className="font-data text-sm text-[var(--text-primary)]">{sc.name}</span>
                  <span className="text-[var(--text-label)] text-xs font-data ml-2">{sc.location}</span>
                  <ArkBadge color={sc.is_active ? 'alive' : 'crimson'} className="text-[9px] ml-2">
                    {sc.is_active ? 'Ativo' : 'Inativo'}
                  </ArkBadge>
                  <span className="text-[var(--text-ghost)] text-xs font-data ml-2">{presence} presentes</span>
                </div>
                {sc.is_active && (
                  <ArkButton size="sm" variant="danger" disabled={loading} onClick={() => runAction(() => gmCloseScenario(sc.id))}>
                    Fechar
                  </ArkButton>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lore */}
      {section === 'lore' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-data text-[var(--text-label)]">GM Character ID:</span>
            <input value={gmCharId} onChange={(e) => setGmCharId(e.target.value)} placeholder="UUID do personagem GM" className="input-sm flex-1" />
          </div>

          {unconfirmedLore.map((entry) => (
            <div key={entry.id} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 flex items-center justify-between">
              <div>
                <span className="font-display text-sm text-[var(--text-primary)]">{entry.title}</span>
                <span className="text-[var(--text-label)] text-xs font-data ml-2">
                  por {entry.characters?.name ?? entry.character_id.slice(0, 8)}
                </span>
              </div>
              <ArkButton
                size="sm"
                disabled={loading || !gmCharId}
                onClick={() => runAction(() => gmConfirmLore(entry.id, gmCharId))}
              >
                Confirmar Lore
              </ArkButton>
            </div>
          ))}
          {unconfirmedLore.length === 0 && (
            <p className="text-[var(--text-label)] text-sm font-body italic">Nenhuma entrada pendente.</p>
          )}
        </div>
      )}

      <style jsx>{`
        .input-sm {
          padding: 4px 8px;
          font-size: 12px;
          background: var(--ark-void);
          border: 1px solid var(--ark-border);
          border-radius: 2px;
          color: var(--text-primary);
          font-family: var(--font-data);
        }
        .input-sm:focus {
          outline: none;
          border-color: var(--ark-border-bright);
        }
      `}</style>
    </div>
  )
}

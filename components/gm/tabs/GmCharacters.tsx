'use client'

import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import {
  gmGrantXP, gmGrantLibras, gmGrantGemas, gmGrantTicket,
  gmGrantItem, gmGrantTitle, gmRevokeTitle, gmUnlockResonance,
  gmUpdateReputation, gmEditCharacterStatus, gmForceRecovery, gmClearRecovery,
} from '@/app/gm/actions'
import type { CharacterWithAttributes } from '@/types'

interface Props {
  characters: CharacterWithAttributes[]
  titleDefs: Array<{ id: string; name: string; category: string; is_unique: boolean }>
  allItems: Array<{ id: string; name: string; item_type: string; rarity: string }>
  factions: Array<{ id: string; slug: string; name: string }>
}

const ARCHETYPES = [
  'ordem', 'caos', 'tempo', 'espaco', 'materia', 'vida',
  'morte', 'vontade', 'sonho', 'guerra', 'vinculo', 'ruina',
]

const STATUS_BADGE: Record<string, 'alive' | 'injured' | 'dead'> = {
  active: 'alive', injured: 'injured', dead: 'dead',
}

export default function GmCharacters({ characters, titleDefs, allItems, factions }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')

  // Action form states
  const [xpAmount, setXpAmount] = useState('')
  const [librasAmount, setLibrasAmount] = useState('')
  const [gemasAmount, setGemasAmount] = useState('')
  const [itemId, setItemId] = useState('')
  const [itemQty, setItemQty] = useState('1')
  const [titleId, setTitleId] = useState('')
  const [revokeTitleId, setRevokeTitleId] = useState('')
  const [archetype, setArchetype] = useState('')
  const [factionSlug, setFactionSlug] = useState('')
  const [repDelta, setRepDelta] = useState('')
  const [recoveryHours, setRecoveryHours] = useState('')

  const filtered = search
    ? characters.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : characters

  async function runAction(fn: () => Promise<{ success?: boolean; error?: string }>) {
    setLoading(true)
    setMsg('')
    try {
      const result = await fn()
      if (result.error) setMsg(result.error)
      else setMsg('OK')
    } catch (err) {
      setMsg(String(err))
    }
    setLoading(false)
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      setMsg('')
      setXpAmount('')
      setLibrasAmount('')
      setGemasAmount('')
      setItemId('')
      setItemQty('1')
      setTitleId('')
      setRevokeTitleId('')
      setArchetype('')
      setFactionSlug('')
      setRepDelta('')
      setRecoveryHours('')
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar personagem..."
        className="w-full px-3 py-2 bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-sm font-data text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:border-[var(--ark-border-bright)] focus:outline-none"
      />

      {filtered.map((char) => {
        const attrs = char.character_attributes
        const wallet = char.character_wallet
        const isExpanded = expandedId === char.id
        const raceName = (char.race as unknown as { name: string } | null)?.name ?? '—'
        const className = ((char as unknown as Record<string, unknown>).classes as { name: string } | null)?.name ?? '—'

        return (
          <div key={char.id} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm">
            {/* Header */}
            <button
              onClick={() => toggleExpand(char.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--ark-surface-hover)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-[var(--ark-gold-bright)]">{char.name}</span>
                <span className="font-data text-xs text-[var(--text-label)]">Nv {char.level}</span>
                <span className="font-data text-xs text-[var(--text-ghost)]">{raceName} · {className}</span>
                <ArkBadge color={STATUS_BADGE[char.status]} className="text-[9px]">{char.status}</ArkBadge>
              </div>
              <span className="text-[var(--text-ghost)] text-xs">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {/* Expanded panel */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-[var(--ark-border)] pt-3 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 text-xs font-data">
                  <div><span className="text-[var(--text-label)]">ATQ</span> <span className="text-[var(--text-primary)]">{attrs?.ataque ?? 0}</span></div>
                  <div><span className="text-[var(--text-label)]">DEF</span> <span className="text-[var(--text-primary)]">{attrs?.defesa ?? 0}</span></div>
                  <div><span className="text-[var(--text-label)]">MAG</span> <span className="text-[var(--text-primary)]">{attrs?.magia ?? 0}</span></div>
                  <div><span className="text-[var(--text-label)]">VIT</span> <span className="text-[var(--text-primary)]">{attrs?.vitalidade ?? 0}</span></div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs font-data">
                  <div><span className="text-[var(--text-label)]">Libras</span> <span className="text-[var(--text-primary)]">{wallet?.libras ?? 0}</span></div>
                  <div><span className="text-[var(--text-label)]">Essencia</span> <span className="text-[var(--text-primary)]">{wallet?.essencia ?? 0}</span></div>
                  <div><span className="text-[var(--text-label)]">Gemas</span> <span className="text-[var(--text-primary)]">{wallet?.premium_currency ?? 0}</span></div>
                  <div><span className="text-[var(--text-label)]">Tickets</span> <span className="text-[var(--text-primary)]">{wallet?.summon_tickets ?? 0}</span></div>
                </div>

                {msg && <p className={`text-xs font-data ${msg === 'OK' ? 'text-status-alive' : 'text-[var(--ark-red-glow)]'}`}>{msg}</p>}

                {/* Action rows */}
                <div className="space-y-2">
                  {/* XP */}
                  <ActionRow label="XP">
                    <input type="number" value={xpAmount} onChange={(e) => setXpAmount(e.target.value)} placeholder="Quantidade" className="action-input" />
                    <ArkButton size="sm" disabled={loading || !xpAmount} onClick={() => runAction(() => gmGrantXP(char.id, Number(xpAmount)))}>Conceder</ArkButton>
                  </ActionRow>

                  {/* Libras */}
                  <ActionRow label="Libras">
                    <input type="number" value={librasAmount} onChange={(e) => setLibrasAmount(e.target.value)} placeholder="Quantidade" className="action-input" />
                    <ArkButton size="sm" disabled={loading || !librasAmount} onClick={() => runAction(() => gmGrantLibras(char.id, Number(librasAmount)))}>Conceder</ArkButton>
                  </ActionRow>

                  {/* Gemas */}
                  <ActionRow label="Gemas">
                    <input type="number" value={gemasAmount} onChange={(e) => setGemasAmount(e.target.value)} placeholder="Quantidade" className="action-input" />
                    <ArkButton size="sm" disabled={loading || !gemasAmount} onClick={() => runAction(() => gmGrantGemas(char.id, Number(gemasAmount)))}>Conceder</ArkButton>
                  </ActionRow>

                  {/* Ticket */}
                  <ActionRow label="Ticket">
                    <ArkButton size="sm" disabled={loading} onClick={() => runAction(() => gmGrantTicket(char.id))}>+1 Ticket</ArkButton>
                  </ActionRow>

                  {/* Item */}
                  <ActionRow label="Item">
                    <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="action-input">
                      <option value="">Selecionar item...</option>
                      {allItems.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.rarity})</option>)}
                    </select>
                    <input type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} className="action-input w-16" min="1" />
                    <ArkButton size="sm" disabled={loading || !itemId} onClick={() => runAction(() => gmGrantItem(char.id, itemId, Number(itemQty)))}>Conceder</ArkButton>
                  </ActionRow>

                  {/* Title */}
                  <ActionRow label="Titulo">
                    <select value={titleId} onChange={(e) => setTitleId(e.target.value)} className="action-input">
                      <option value="">Selecionar titulo...</option>
                      {titleDefs.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                    </select>
                    <ArkButton size="sm" disabled={loading || !titleId} onClick={() => runAction(() => gmGrantTitle(char.id, titleId))}>Conceder</ArkButton>
                  </ActionRow>

                  {/* Revoke Title */}
                  <ActionRow label="Revogar Titulo">
                    <input type="text" value={revokeTitleId} onChange={(e) => setRevokeTitleId(e.target.value)} placeholder="ID do titulo" className="action-input" />
                    <ArkButton size="sm" variant="danger" disabled={loading || !revokeTitleId} onClick={() => runAction(() => gmRevokeTitle(char.id, revokeTitleId))}>Revogar</ArkButton>
                  </ActionRow>

                  {/* Resonance */}
                  <ActionRow label="Ressonancia">
                    <select value={archetype} onChange={(e) => setArchetype(e.target.value)} className="action-input">
                      <option value="">Arquetipo...</option>
                      {ARCHETYPES.map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                    </select>
                    <ArkButton size="sm" disabled={loading || !archetype} onClick={() => runAction(() => gmUnlockResonance(char.id, archetype))}>Desbloquear</ArkButton>
                  </ActionRow>

                  {/* Reputation */}
                  <ActionRow label="Reputacao">
                    <select value={factionSlug} onChange={(e) => setFactionSlug(e.target.value)} className="action-input">
                      <option value="">Faccao...</option>
                      {factions.map((f) => <option key={f.id} value={f.slug}>{f.name}</option>)}
                    </select>
                    <input type="number" value={repDelta} onChange={(e) => setRepDelta(e.target.value)} placeholder="Delta" className="action-input w-20" />
                    <ArkButton size="sm" disabled={loading || !factionSlug || !repDelta} onClick={() => runAction(() => gmUpdateReputation(char.id, factionSlug, Number(repDelta)))}>Aplicar</ArkButton>
                  </ActionRow>

                  {/* Status */}
                  <ActionRow label="Status">
                    <ArkButton size="sm" variant="ghost" disabled={loading} onClick={() => runAction(() => gmEditCharacterStatus(char.id, 'active'))}>Ativo</ArkButton>
                    <ArkButton size="sm" variant="ghost" disabled={loading} onClick={() => runAction(() => gmEditCharacterStatus(char.id, 'injured'))}>Ferido</ArkButton>
                    <ArkButton size="sm" variant="danger" disabled={loading} onClick={() => runAction(() => gmEditCharacterStatus(char.id, 'dead'))}>Morto</ArkButton>
                  </ActionRow>

                  {/* Recovery */}
                  <ActionRow label="Recovery">
                    <input type="number" value={recoveryHours} onChange={(e) => setRecoveryHours(e.target.value)} placeholder="Horas" className="action-input w-20" />
                    <ArkButton size="sm" disabled={loading || !recoveryHours} onClick={() => runAction(() => gmForceRecovery(char.id, Number(recoveryHours)))}>Forcar</ArkButton>
                    <ArkButton size="sm" variant="ghost" disabled={loading} onClick={() => runAction(() => gmClearRecovery(char.id))}>Limpar</ArkButton>
                  </ActionRow>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {filtered.length === 0 && (
        <p className="text-[var(--text-label)] text-sm font-body italic text-center py-4">Nenhum personagem encontrado.</p>
      )}

      <style jsx>{`
        .action-input {
          padding: 4px 8px;
          font-size: 12px;
          background: var(--ark-void);
          border: 1px solid var(--ark-border);
          border-radius: 2px;
          color: var(--text-primary);
          font-family: var(--font-data);
          flex: 1;
          min-width: 0;
        }
        .action-input:focus {
          outline: none;
          border-color: var(--ark-border-bright);
        }
      `}</style>
    </div>
  )
}

function ActionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-data text-[10px] text-[var(--text-label)] uppercase tracking-wider w-24 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}

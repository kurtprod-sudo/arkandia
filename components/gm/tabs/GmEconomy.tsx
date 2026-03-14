'use client'

import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import ArkModal from '@/components/ui/ArkModal'
import {
  gmToggleCatalog, gmCreateSummonCatalog, gmAddCatalogItem, gmGrantToAll,
} from '@/app/gm/actions'

interface Props {
  recentPayments: Array<{ id: string; character_id: string; status: string; amount_brl: number; gemas_amount: number; created_at: string; characters: { name: string } | null }>
  summonCatalogs: Array<{ id: string; name: string; is_active: boolean; cost_gemas: number; pity_threshold: number }>
  allItems: Array<{ id: string; name: string; item_type: string; rarity: string }>
  characterCount: number
}

const PAYMENT_BADGE: Record<string, 'alive' | 'injured' | 'crimson'> = {
  approved: 'alive',
  pending: 'injured',
  rejected: 'crimson',
  cancelled: 'crimson',
  expired: 'crimson',
}

export default function GmEconomy({ recentPayments, summonCatalogs, allItems, characterCount }: Props) {
  const [section, setSection] = useState<'payments' | 'summon' | 'grant'>('payments')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Catalog form
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catGemas, setCatGemas] = useState('')
  const [catTickets, setCatTickets] = useState('')
  const [catPity, setCatPity] = useState('')

  // Catalog item
  const [addCatId, setAddCatId] = useState('')
  const [addItemId, setAddItemId] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [addWeight, setAddWeight] = useState('100')
  const [addPityEligible, setAddPityEligible] = useState(false)

  // Grant all
  const [grantType, setGrantType] = useState<'gemas' | 'tickets'>('gemas')
  const [grantAmount, setGrantAmount] = useState('')
  const [confirmModal, setConfirmModal] = useState(false)

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

  const totalApproved = recentPayments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + Number(p.amount_brl), 0)

  const sections = [
    { key: 'payments' as const, label: 'Pagamentos' },
    { key: 'summon' as const, label: 'Summon' },
    { key: 'grant' as const, label: 'Grant em Massa' },
  ]

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

      {/* Payments */}
      {section === 'payments' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-data">
            <thead>
              <tr className="border-b border-[var(--ark-border)] text-[var(--text-label)] uppercase tracking-wider">
                <th className="text-left py-2 px-2">Personagem</th>
                <th className="text-left py-2 px-2">Valor</th>
                <th className="text-left py-2 px-2">Gemas</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-left py-2 px-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id} className="border-b border-[var(--ark-border)]/50">
                  <td className="py-2 px-2 text-[var(--text-primary)]">{p.characters?.name ?? p.character_id.slice(0, 8)}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">R$ {Number(p.amount_brl).toFixed(2).replace('.', ',')}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{p.gemas_amount}</td>
                  <td className="py-2 px-2">
                    <ArkBadge color={PAYMENT_BADGE[p.status] ?? 'crimson'} className="text-[9px]">{p.status}</ArkBadge>
                  </td>
                  <td className="py-2 px-2 text-[var(--text-ghost)]">
                    {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-right text-xs font-data text-[var(--text-label)]">
            Total aprovado: <span className="text-status-alive font-bold">R$ {totalApproved.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      )}

      {/* Summon */}
      {section === 'summon' && (
        <div className="space-y-4">
          {/* Create catalog */}
          <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-2">
            <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Criar Catalogo</h4>
            <div className="grid grid-cols-2 gap-2">
              <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nome" className="input-sm" />
              <input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Descricao" className="input-sm" />
            </div>
            <div className="flex gap-2">
              <input type="number" value={catGemas} onChange={(e) => setCatGemas(e.target.value)} placeholder="Custo Gemas" className="input-sm" />
              <input type="number" value={catTickets} onChange={(e) => setCatTickets(e.target.value)} placeholder="Custo Tickets" className="input-sm" />
              <input type="number" value={catPity} onChange={(e) => setCatPity(e.target.value)} placeholder="Pity" className="input-sm" />
              <ArkButton size="sm" disabled={loading || !catName} onClick={() => runAction(() => gmCreateSummonCatalog({
                name: catName, description: catDesc, costGemas: Number(catGemas), costTickets: Number(catTickets), pityThreshold: Number(catPity),
              }))}>Criar</ArkButton>
            </div>
          </div>

          {/* Catalog list */}
          {summonCatalogs.map((cat) => (
            <div key={cat.id} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-data text-sm text-[var(--text-primary)]">{cat.name}</span>
                  <span className="text-[var(--text-ghost)] text-xs font-data ml-2">{cat.cost_gemas}G / Pity {cat.pity_threshold}</span>
                </div>
                <ArkButton size="sm" variant={cat.is_active ? 'danger' : 'primary'} disabled={loading} onClick={() => runAction(() => gmToggleCatalog(cat.id, !cat.is_active))}>
                  {cat.is_active ? 'Desativar' : 'Ativar'}
                </ArkButton>
              </div>
              {/* Add item to catalog */}
              <div className="flex items-center gap-1">
                <select value={addCatId === cat.id ? addItemId : ''} onChange={(e) => { setAddCatId(cat.id); setAddItemId(e.target.value) }} className="input-sm flex-1">
                  <option value="">Adicionar item...</option>
                  {allItems.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.rarity})</option>)}
                </select>
                <input type="number" value={addCatId === cat.id ? addQty : ''} onChange={(e) => { setAddCatId(cat.id); setAddQty(e.target.value) }} placeholder="Qtd" className="input-sm w-14" />
                <input type="number" value={addCatId === cat.id ? addWeight : ''} onChange={(e) => { setAddCatId(cat.id); setAddWeight(e.target.value) }} placeholder="Peso" className="input-sm w-14" />
                <label className="flex items-center gap-1 text-[10px] font-data text-[var(--text-label)]">
                  <input type="checkbox" checked={addCatId === cat.id && addPityEligible} onChange={(e) => { setAddCatId(cat.id); setAddPityEligible(e.target.checked) }} />
                  Pity
                </label>
                <ArkButton size="sm" disabled={loading || addCatId !== cat.id || !addItemId} onClick={() => runAction(() => gmAddCatalogItem({
                  catalogId: cat.id, itemId: addItemId, quantity: Number(addQty), weight: Number(addWeight), isPityEligible: addPityEligible,
                }))}>+</ArkButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grant all */}
      {section === 'grant' && (
        <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
          <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">
            Conceder a todos os personagens ativos ({characterCount})
          </h4>
          <div className="flex items-center gap-2">
            <select value={grantType} onChange={(e) => setGrantType(e.target.value as 'gemas' | 'tickets')} className="input-sm">
              <option value="gemas">Gemas</option>
              <option value="tickets">Tickets</option>
            </select>
            <input type="number" value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} placeholder="Quantidade" className="input-sm" min="1" />
            <ArkButton size="sm" variant="danger" disabled={loading || !grantAmount} onClick={() => setConfirmModal(true)}>
              Conceder a Todos
            </ArkButton>
          </div>

          <ArkModal open={confirmModal} onClose={() => setConfirmModal(false)} title="Confirmar Grant em Massa">
            <p className="not-italic">
              Conceder <strong>{grantAmount} {grantType}</strong> a todos os {characterCount} personagens ativos?
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <ArkButton variant="ghost" size="sm" onClick={() => setConfirmModal(false)}>Cancelar</ArkButton>
              <ArkButton variant="danger" size="sm" disabled={loading} onClick={async () => {
                setConfirmModal(false)
                await runAction(() => gmGrantToAll(grantType, Number(grantAmount)))
              }}>Confirmar</ArkButton>
            </div>
          </ArkModal>
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

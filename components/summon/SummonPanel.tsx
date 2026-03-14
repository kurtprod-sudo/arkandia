'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import ArkModal from '@/components/ui/ArkModal'

// ─── Types ──────────────────────────────────────────────────────

interface CatalogItemView {
  id: string
  itemName: string
  itemRarity: string
  quantity: number
  weight: number
  probability: number
  isPityEligible: boolean
}

interface CatalogView {
  id: string
  name: string
  description: string
  costGemas: number
  costTickets: number
  pityThreshold: number
  pullsSinceRare: number
  totalPulls: number
  items: CatalogItemView[]
}

interface HistoryView {
  id: string
  itemName: string
  itemRarity: string
  quantity: number
  costType: string
  wasPity: boolean
  createdAt: string
}

interface SummonResult {
  itemId: string
  itemName: string
  itemRarity: string
  quantity: number
  wasPity: boolean
}

interface SummonPanelProps {
  characterId: string
  gemas: number
  tickets: number
  catalogs: CatalogView[]
  history: HistoryView[]
}

// ─── Helpers ────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, 'bronze' | 'gold' | 'crimson' | 'dead'> = {
  comum: 'dead',
  incomum: 'bronze',
  raro: 'crimson',
  epico: 'gold',
  lendario: 'gold',
}

const RARITY_BORDER: Record<string, string> = {
  comum: 'border-[var(--ark-border)]',
  incomum: 'border-[var(--ark-gold-dim)]',
  raro: 'border-[var(--ark-red)]',
  epico: 'border-[var(--ark-gold)]',
  lendario: 'border-[var(--ark-gold-bright)]',
}

function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <ArkBadge color={RARITY_COLORS[rarity] ?? 'dead'}>
      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
    </ArkBadge>
  )
}

// ─── Component ──────────────────────────────────────────────────

export default function SummonPanel({
  characterId,
  gemas,
  tickets,
  catalogs,
  history,
}: SummonPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SummonResult | null>(null)

  async function handleSummon(catalogId: string, costType: 'gemas' | 'ticket') {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/summon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          catalog_id: catalogId,
          cost_type: costType,
        }),
      })
      const data = await res.json()
      if (data.success && data.result) {
        setResult(data.result)
      } else {
        alert(data.error ?? 'Erro ao invocar.')
      }
    } catch {
      alert('Erro de conexão.')
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Saldo ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 p-4 rounded-sm bg-[var(--ark-bg-raised)] border border-[var(--ark-border)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Gemas</span>
          <span className="text-lg font-data font-bold text-[var(--ark-gold-bright)]">{gemas}</span>
        </div>
        <div className="w-px h-6 bg-[var(--ark-border)]" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Tickets</span>
          <span className="text-lg font-data font-bold text-[var(--text-primary)]">{tickets}</span>
        </div>
      </div>

      {/* ─── Catálogos Ativos ──────────────────────────────────── */}
      {catalogs.length === 0 ? (
        <p className="text-sm font-body text-[var(--text-ghost)] italic text-center py-8">
          Nenhum catálogo de invocação ativo no momento.
        </p>
      ) : (
        catalogs.map((catalog) => {
          const pityPercent = catalog.pityThreshold > 0
            ? Math.min(100, (catalog.pullsSinceRare / catalog.pityThreshold) * 100)
            : 0

          return (
            <div
              key={catalog.id}
              className="p-4 rounded-sm bg-[var(--ark-bg-raised)] border border-[var(--ark-border)] space-y-4"
            >
              {/* Header */}
              <div>
                <h3 className="font-display text-lg text-[var(--text-primary)]">
                  {catalog.name}
                </h3>
                <p className="text-xs font-body text-[var(--text-secondary)] mt-1">
                  {catalog.description}
                </p>
              </div>

              {/* Custo */}
              <div className="flex items-center gap-4 text-xs font-data text-[var(--text-label)]">
                <span>Custo: <span className="text-[var(--ark-gold-bright)]">{catalog.costGemas} Gemas</span></span>
                {catalog.costTickets > 0 && (
                  <>
                    <span>ou</span>
                    <span><span className="text-[var(--text-primary)]">{catalog.costTickets} Ticket</span></span>
                  </>
                )}
              </div>

              {/* Pity progress */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">
                    Garantia (Pity)
                  </span>
                  <span className="text-xs font-data text-[var(--text-secondary)]">
                    {catalog.pullsSinceRare} / {catalog.pityThreshold} pulls
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#1e1210] border border-[var(--text-ghost)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pityPercent}%`,
                      background: pityPercent >= 80
                        ? 'linear-gradient(to right, #d3a539, #ffd700)'
                        : 'linear-gradient(to right, #2a1a08, #d3a539)',
                    }}
                  />
                </div>
              </div>

              {/* Tabela de probabilidades */}
              {catalog.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-2">
                    Probabilidades
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-data">
                      <thead>
                        <tr className="border-b border-[var(--ark-border)]">
                          <th className="text-left py-1.5 text-[var(--text-label)]">Item</th>
                          <th className="text-center py-1.5 text-[var(--text-label)]">Raridade</th>
                          <th className="text-center py-1.5 text-[var(--text-label)]">Qtd</th>
                          <th className="text-right py-1.5 text-[var(--text-label)]">Chance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.items.map((item) => (
                          <tr key={item.id} className="border-b border-[var(--ark-border)]/30">
                            <td className="py-1.5 text-[var(--text-secondary)]">
                              {item.itemName}
                              {item.isPityEligible && (
                                <span className="ml-1 text-[var(--ark-gold-dim)] text-[10px]" title="Elegível para Pity">
                                  ★
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 text-center">
                              <RarityBadge rarity={item.itemRarity} />
                            </td>
                            <td className="py-1.5 text-center text-[var(--text-secondary)]">
                              {item.quantity}
                            </td>
                            <td className="py-1.5 text-right text-[var(--text-primary)] tabular-nums">
                              {item.probability}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botões de invocação */}
              <div className="flex gap-3 pt-2">
                <ArkButton
                  onClick={() => handleSummon(catalog.id, 'gemas')}
                  disabled={loading || gemas < catalog.costGemas}
                  size="sm"
                >
                  {loading ? 'Invocando...' : `Invocar com ${catalog.costGemas} Gemas`}
                </ArkButton>
                {catalog.costTickets > 0 && (
                  <ArkButton
                    variant="secondary"
                    onClick={() => handleSummon(catalog.id, 'ticket')}
                    disabled={loading || tickets < catalog.costTickets}
                    size="sm"
                  >
                    {loading ? 'Invocando...' : `Invocar com Ticket`}
                  </ArkButton>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* ─── Modal de Resultado ───────────────────────────────── */}
      <ArkModal
        open={!!result}
        onClose={() => setResult(null)}
        title="Resultado da Invocação"
        actions={
          <ArkButton onClick={() => setResult(null)} size="sm">
            Fechar
          </ArkButton>
        }
      >
        {result && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className={`p-6 rounded-sm border-2 ${RARITY_BORDER[result.itemRarity] ?? 'border-[var(--ark-border)]'} bg-[var(--ark-bg)]/60`}
            >
              <p className="font-display text-lg text-center text-[var(--text-primary)]">
                {result.itemName}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <RarityBadge rarity={result.itemRarity} />
                {result.wasPity && (
                  <ArkBadge color="gold">PITY</ArkBadge>
                )}
              </div>
              {result.quantity > 1 && (
                <p className="text-xs font-data text-[var(--text-secondary)] text-center mt-2">
                  x{result.quantity}
                </p>
              )}
            </div>
          </div>
        )}
      </ArkModal>

      {/* ─── Histórico Recente ─────────────────────────────────── */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-base text-[var(--text-primary)]">
            Histórico Recente
          </h3>
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between p-3 rounded-sm bg-[var(--ark-bg-raised)] border border-[var(--ark-border)]/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-body text-[var(--text-secondary)]">
                    {h.itemName}
                  </span>
                  <RarityBadge rarity={h.itemRarity} />
                  {h.wasPity && (
                    <ArkBadge color="gold">PITY</ArkBadge>
                  )}
                  {h.quantity > 1 && (
                    <span className="text-xs font-data text-[var(--text-label)]">
                      x{h.quantity}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs font-data text-[var(--text-ghost)]">
                  <span>{h.costType === 'gemas' ? 'Gemas' : 'Ticket'}</span>
                  <span>{new Date(h.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import ArkModal from '@/components/ui/ArkModal'

// ─── Types ──────────────────────────────────────────────────────

interface ListingView {
  id: string
  sellerId: string
  sellerName: string
  itemId: string
  itemName: string
  itemRarity: string
  itemType: string
  quantity: number
  priceLibras: number
}

interface AuctionView {
  id: string
  sellerId: string
  sellerName: string
  itemId: string
  itemName: string
  itemRarity: string
  quantity: number
  startingPrice: number
  currentBid: number
  currentBidder: string | null
  endsAt: string
}

interface RecipeView {
  id: string
  name: string
  resultItemName: string
  resultItemRarity: string
  resultQuantity: number
  ingredients: Array<{ item_id: string; quantity: number }>
  craftingCost: number
  requiredLevel: number
}

interface InventoryView {
  id: string
  itemId: string
  itemName: string
  itemDescription: string
  itemType: string
  itemRarity: string
  isTradeable: boolean
  quantity: number
}

interface MarketTabsProps {
  characterId: string
  characterLevel: number
  listings: ListingView[]
  auctions: AuctionView[]
  recipes: RecipeView[]
  inventory: InventoryView[]
}

// ─── Helpers ────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, 'bronze' | 'gold' | 'crimson' | 'dead'> = {
  comum: 'dead',
  incomum: 'bronze',
  raro: 'crimson',
  epico: 'gold',
  lendario: 'gold',
}

function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <ArkBadge color={RARITY_COLORS[rarity] ?? 'dead'}>
      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
    </ArkBadge>
  )
}

function formatCountdown(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return 'Encerrado'
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${h}h ${m}m`
}

const TAB_LABELS = ['Bazaar', 'Leilões', 'Crafting', 'Meu Inventário'] as const

// ─── Component ──────────────────────────────────────────────────

export default function MarketTabs({
  characterId,
  characterLevel,
  listings,
  auctions,
  recipes,
  inventory,
}: MarketTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sell modal
  const [sellModal, setSellModal] = useState<InventoryView | null>(null)
  const [sellPrice, setSellPrice] = useState('')
  const [sellQty, setSellQty] = useState('1')

  // Auction modal
  const [auctionModal, setAuctionModal] = useState<InventoryView | null>(null)
  const [auctionStartPrice, setAuctionStartPrice] = useState('')
  const [auctionQty, setAuctionQty] = useState('1')
  const [auctionDuration, setAuctionDuration] = useState('24')

  // Bid input
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({})

  // Countdown refresh
  const [, setTick] = useState(0)
  useEffect(() => {
    if (activeTab !== 1) return
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [activeTab])

  const doFetch = async (
    url: string,
    body: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        router.refresh()
        return { success: true }
      } else {
        setError(data.error ?? 'Erro desconhecido.')
        return { success: false, error: data.error }
      }
    } catch {
      setError('Erro de conexão.')
      return { success: false, error: 'Erro de conexão.' }
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = (listingId: string) =>
    doFetch('/api/market/buy', { listing_id: listingId, buyer_id: characterId })

  const handleCancel = (listingId: string) =>
    doFetch('/api/market/cancel', { listing_id: listingId })

  const handleSell = async () => {
    if (!sellModal) return
    const result = await doFetch('/api/market/list', {
      character_id: characterId,
      item_id: sellModal.itemId,
      quantity: parseInt(sellQty, 10) || 1,
      price_libras: parseInt(sellPrice, 10) || 1,
    })
    if (result.success) {
      setSellModal(null)
      setSellPrice('')
      setSellQty('1')
    }
  }

  const handleCreateAuction = async () => {
    if (!auctionModal) return
    const result = await doFetch('/api/auction/create', {
      character_id: characterId,
      item_id: auctionModal.itemId,
      quantity: parseInt(auctionQty, 10) || 1,
      starting_price: parseInt(auctionStartPrice, 10) || 1,
      duration_hours: parseInt(auctionDuration, 10) || 24,
    })
    if (result.success) {
      setAuctionModal(null)
      setAuctionStartPrice('')
      setAuctionQty('1')
      setAuctionDuration('24')
    }
  }

  const handleBid = (auctionId: string) => {
    const amount = parseInt(bidAmounts[auctionId] ?? '', 10)
    if (!amount || amount <= 0) return
    doFetch('/api/auction/bid', {
      auction_id: auctionId,
      bidder_id: characterId,
      amount,
    })
  }

  const handleCraft = (recipeId: string) =>
    doFetch('/api/craft', { character_id: characterId, recipe_id: recipeId })

  // Inventory item IDs for crafting check
  const inventoryMap: Record<string, number> = {}
  for (const inv of inventory) {
    inventoryMap[inv.itemId] = (inventoryMap[inv.itemId] ?? 0) + inv.quantity
  }

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm border border-[var(--ark-border)] p-1">
        {TAB_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 px-3 rounded-sm text-xs font-data uppercase tracking-wider transition-all duration-200 ${
              activeTab === i
                ? 'bg-[rgba(196,42,30,0.2)] text-[var(--text-primary)] border border-[var(--ark-border-bright)]'
                : 'text-[var(--text-ghost)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-[var(--ark-red-glow)] font-body">{error}</p>
      )}

      {/* Bazaar Tab */}
      {activeTab === 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
            Listagens Ativas ({listings.length})
          </p>
          {listings.length === 0 ? (
            <p className="text-xs text-[var(--text-ghost)] font-body italic">
              Nenhuma listagem ativa no Bazaar.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border border-[var(--ark-border)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-data text-sm text-[var(--text-primary)]">
                      {l.itemName}
                    </p>
                    <RarityBadge rarity={l.itemRarity} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-ghost)] font-data mb-3">
                    <span>Qtd: {l.quantity}</span>
                    <span className="text-[var(--text-secondary)]">
                      {l.priceLibras} Libras
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-data text-[var(--text-ghost)]">
                      Vendedor: {l.sellerName}
                    </span>
                    {l.sellerId === characterId ? (
                      <ArkButton
                        size="sm"
                        onClick={() => handleCancel(l.id)}
                        disabled={loading}
                      >
                        Cancelar
                      </ArkButton>
                    ) : (
                      <ArkButton
                        size="sm"
                        onClick={() => handleBuy(l.id)}
                        disabled={loading}
                      >
                        Comprar
                      </ArkButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Auctions Tab */}
      {activeTab === 1 && (
        <div className="space-y-3">
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
            Leilões Ativos ({auctions.length})
          </p>
          {auctions.length === 0 ? (
            <p className="text-xs text-[var(--text-ghost)] font-body italic">
              Nenhum leilão ativo.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {auctions.map((a) => {
                const isLeader = a.currentBidder === characterId
                return (
                  <div
                    key={a.id}
                    className={`bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border ${
                      isLeader
                        ? 'border-[var(--ark-gold)]'
                        : 'border-[var(--ark-border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-data text-sm text-[var(--text-primary)]">
                        {a.itemName}
                      </p>
                      <RarityBadge rarity={a.itemRarity} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-data mb-2">
                      <div>
                        <p className="text-[var(--text-ghost)]">Lance atual</p>
                        <p className="text-[var(--text-secondary)]">
                          {a.currentBid > 0 ? `${a.currentBid} Libras` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--text-ghost)]">Mínimo</p>
                        <p className="text-[var(--text-secondary)]">
                          {a.currentBid > 0
                            ? `${a.currentBid + 1} Libras`
                            : `${a.startingPrice} Libras`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-data text-[var(--text-ghost)]">
                        Encerra em: {formatCountdown(a.endsAt)}
                      </span>
                      {isLeader && (
                        <span className="text-[9px] font-data text-[var(--ark-gold)]">
                          Seu lance lidera
                        </span>
                      )}
                    </div>
                    {a.sellerId !== characterId && (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Valor"
                          value={bidAmounts[a.id] ?? ''}
                          onChange={(e) =>
                            setBidAmounts((prev) => ({
                              ...prev,
                              [a.id]: e.target.value,
                            }))
                          }
                          className="flex-1 px-2 py-1.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm font-data focus:outline-none focus:border-[var(--ark-border-bright)] transition-all duration-200"
                        />
                        <ArkButton
                          size="sm"
                          onClick={() => handleBid(a.id)}
                          disabled={loading}
                        >
                          Lance
                        </ArkButton>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Crafting Tab */}
      {activeTab === 2 && (
        <div className="space-y-3">
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
            Receitas Disponíveis ({recipes.length})
          </p>
          {recipes.length === 0 ? (
            <p className="text-xs text-[var(--text-ghost)] font-body italic">
              Nenhuma receita de crafting disponível.
            </p>
          ) : (
            <div className="space-y-3">
              {recipes.map((r) => {
                const canCraft =
                  characterLevel >= r.requiredLevel &&
                  r.ingredients.every(
                    (ing) => (inventoryMap[ing.item_id] ?? 0) >= ing.quantity
                  )
                return (
                  <div
                    key={r.id}
                    className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border border-[var(--ark-border)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-data text-sm text-[var(--text-primary)]">
                          {r.name}
                        </p>
                        <p className="text-[9px] font-data text-[var(--text-ghost)]">
                          Resultado: {r.resultQuantity}x {r.resultItemName}
                        </p>
                        {r.craftingCost > 0 && (
                          <p className="text-[9px] font-data text-[var(--ark-gold)]">
                            Custo: {r.craftingCost} Libras
                          </p>
                        )}
                      </div>
                      <RarityBadge rarity={r.resultItemRarity} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] font-data text-[var(--text-ghost)]">
                        {r.ingredients.length > 0 ? (
                          r.ingredients.map((ing, i) => {
                            const has = (inventoryMap[ing.item_id] ?? 0) >= ing.quantity
                            return (
                              <span
                                key={i}
                                className={
                                  has
                                    ? 'text-[var(--text-secondary)]'
                                    : 'text-[var(--ark-red-glow)]'
                                }
                              >
                                {ing.quantity}x {ing.item_id.slice(0, 8)}
                                {i < r.ingredients.length - 1 ? ' · ' : ''}
                              </span>
                            )
                          })
                        ) : (
                          <span>Sem ingredientes</span>
                        )}
                        {r.requiredLevel > 1 && (
                          <span
                            className={
                              characterLevel >= r.requiredLevel
                                ? 'text-[var(--text-secondary)]'
                                : 'text-[var(--ark-red-glow)]'
                            }
                          >
                            {' '}
                            · Nv {r.requiredLevel}
                          </span>
                        )}
                      </div>
                      <ArkButton
                        size="sm"
                        onClick={() => handleCraft(r.id)}
                        disabled={loading || !canCraft}
                      >
                        Craftar
                      </ArkButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 3 && (
        <div className="space-y-3">
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
            Meu Inventário ({inventory.length})
          </p>
          {inventory.length === 0 ? (
            <p className="text-xs text-[var(--text-ghost)] font-body italic">
              Inventário vazio.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {inventory.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border border-[var(--ark-border)]"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-data text-sm text-[var(--text-primary)]">
                      {inv.itemName}
                    </p>
                    <RarityBadge rarity={inv.itemRarity} />
                  </div>
                  <p className="text-[9px] font-data text-[var(--text-ghost)] mb-2">
                    {inv.itemType} · Qtd: {inv.quantity}
                  </p>
                  {inv.isTradeable && (
                    <div className="flex gap-2">
                      <ArkButton
                        size="sm"
                        onClick={() => {
                          setSellModal(inv)
                          setSellQty('1')
                          setSellPrice('')
                        }}
                      >
                        Vender no Bazaar
                      </ArkButton>
                      <ArkButton
                        size="sm"
                        onClick={() => {
                          setAuctionModal(inv)
                          setAuctionQty('1')
                          setAuctionStartPrice('')
                          setAuctionDuration('24')
                        }}
                      >
                        Leiloar
                      </ArkButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sell Modal */}
      {sellModal && (
        <ArkModal
          open={!!sellModal}
          title={`Vender: ${sellModal.itemName}`}
          onClose={() => setSellModal(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-1">
                Quantidade (máx: {sellModal.quantity})
              </label>
              <input
                type="number"
                min={1}
                max={sellModal.quantity}
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                className="w-full px-2 py-1.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm font-data focus:outline-none focus:border-[var(--ark-border-bright)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-1">
                Preço (Libras)
              </label>
              <input
                type="number"
                min={1}
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full px-2 py-1.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm font-data focus:outline-none focus:border-[var(--ark-border-bright)]"
              />
            </div>
            <ArkButton
              onClick={handleSell}
              disabled={loading || !sellPrice || !sellQty}
            >
              {loading ? 'Listando…' : 'Confirmar Listagem'}
            </ArkButton>
          </div>
        </ArkModal>
      )}

      {/* Auction Modal */}
      {auctionModal && (
        <ArkModal
          open={!!auctionModal}
          title={`Leiloar: ${auctionModal.itemName}`}
          onClose={() => setAuctionModal(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-1">
                Quantidade (máx: {auctionModal.quantity})
              </label>
              <input
                type="number"
                min={1}
                max={auctionModal.quantity}
                value={auctionQty}
                onChange={(e) => setAuctionQty(e.target.value)}
                className="w-full px-2 py-1.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm font-data focus:outline-none focus:border-[var(--ark-border-bright)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-1">
                Preço Inicial (Libras)
              </label>
              <input
                type="number"
                min={1}
                value={auctionStartPrice}
                onChange={(e) => setAuctionStartPrice(e.target.value)}
                className="w-full px-2 py-1.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm font-data focus:outline-none focus:border-[var(--ark-border-bright)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-1">
                Duração (horas)
              </label>
              <select
                value={auctionDuration}
                onChange={(e) => setAuctionDuration(e.target.value)}
                className="w-full px-2 py-1.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm font-data focus:outline-none focus:border-[var(--ark-border-bright)]"
              >
                <option value="24">24 horas</option>
                <option value="48">48 horas</option>
                <option value="72">72 horas</option>
              </select>
            </div>
            <ArkButton
              onClick={handleCreateAuction}
              disabled={loading || !auctionStartPrice || !auctionQty}
            >
              {loading ? 'Criando…' : 'Confirmar Leilão'}
            </ArkButton>
          </div>
        </ArkModal>
      )}
    </div>
  )
}

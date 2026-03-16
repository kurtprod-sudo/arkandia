'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import {
  Sword, Shield, HardHat, Shirt, Footprints, Gem, Lock, X, ArrowUp,
} from 'lucide-react'

const SLOT_ICONS: Record<string, React.ElementType> = {
  arma_principal:  Sword,
  arma_secundaria: Sword,
  elmo:            HardHat,
  armadura:        Shirt,
  calca:           Shirt,
  bota:            Footprints,
  acessorio_1:     Gem,
  acessorio_2:     Gem,
}

const RARITY_COLORS: Record<string, 'bronze' | 'gold' | 'crimson'> = {
  comum:    'bronze',
  incomum:  'gold',
  raro:     'crimson',
  epico:    'crimson',
  lendario: 'gold',
}

interface SlotDef {
  slot_key: string
  label: string
  slot_order: number
  is_locked: boolean
}

interface EquippedItem {
  slot_key: string
  enhancement: number
  items: {
    id: string
    name: string
    description: string
    rarity: string
    stats: Record<string, number>
    slot_type: string
  } | null
}

interface InventoryItem {
  id: string
  item_id: string
  quantity: number
  items: {
    id: string
    name: string
    rarity: string
    stats: Record<string, number>
    slot_type: string
    required_level: number
  }
}

interface EquipmentPanelProps {
  characterId: string
  slotDefinitions: SlotDef[]
  equippedItems: EquippedItem[]
  inventoryItems: InventoryItem[]
  currentAttrs: Record<string, number>
  librasBalance: number
}

export default function EquipmentPanel({
  characterId,
  slotDefinitions,
  equippedItems,
  inventoryItems,
  currentAttrs,
  librasBalance,
}: EquipmentPanelProps) {
  const router = useRouter()
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [enhanceTarget, setEnhanceTarget] = useState<{ invId: string; name: string; enhancement: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const equipped = Object.fromEntries(equippedItems.map((e) => [e.slot_key, e]))

  // Layout: left slots, silhouette, right slots, bottom weapons
  const leftSlots = slotDefinitions.filter((s) => ['elmo', 'armadura', 'calca', 'bota'].includes(s.slot_key))
  const rightSlots = slotDefinitions.filter((s) => s.slot_key.startsWith('acessorio'))
  const bottomSlots = slotDefinitions.filter((s) => s.slot_key.startsWith('arma'))

  const handleEquip = async (inventoryId: string, slotKey: string) => {
    setLoading(true)
    await fetch('/api/equipment/equip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId, inventory_id: inventoryId, slot_key: slotKey }),
    })
    setSelectedSlot(null)
    setLoading(false)
    router.refresh()
  }

  const handleUnequip = async (slotKey: string) => {
    setLoading(true)
    await fetch('/api/equipment/unequip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId, slot_key: slotKey }),
    })
    setLoading(false)
    router.refresh()
  }

  const handleEnhance = async (inventoryId: string) => {
    setLoading(true)
    await fetch('/api/equipment/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId, inventory_id: inventoryId }),
    })
    setEnhanceTarget(null)
    setLoading(false)
    router.refresh()
  }

  const compatibleItems = selectedSlot
    ? inventoryItems.filter((inv) => {
        const slotType = inv.items?.slot_type
        if (slotType === selectedSlot) return true
        if (slotType?.startsWith('acessorio') && selectedSlot.startsWith('acessorio')) return true
        return false
      })
    : []

  const renderSlot = (slot: SlotDef) => {
    const eq = equipped[slot.slot_key]
    const Icon = SLOT_ICONS[slot.slot_key] ?? Gem
    const isLocked = slot.is_locked

    return (
      <button
        key={slot.slot_key}
        onClick={() => !isLocked && setSelectedSlot(slot.slot_key)}
        disabled={isLocked}
        className={`
          w-14 h-14 rounded-sm border flex flex-col items-center justify-center transition-all relative group
          ${isLocked
            ? 'border-[var(--ark-border)]/30 opacity-40 cursor-not-allowed'
            : eq?.items
              ? 'border-[var(--ark-gold)]/40 bg-[var(--ark-surface)] hover:border-[var(--ark-gold-bright)]'
              : 'border-[var(--ark-border)] bg-[var(--ark-bg)] hover:border-[var(--ark-border-bright)]'
          }
        `}
        title={isLocked ? `${slot.label} (bloqueado)` : eq?.items ? `${eq.items.name}${eq.enhancement > 0 ? ` +${eq.enhancement}` : ''}` : slot.label}
      >
        {isLocked ? (
          <Lock size={16} className="text-[var(--text-ghost)]" />
        ) : eq?.items ? (
          <>
            <Icon size={16} className="text-[var(--ark-gold-bright)]" />
            {eq.enhancement > 0 && (
              <span className="absolute -top-1 -right-1 text-[8px] font-data font-bold text-[var(--ark-gold-bright)] bg-[var(--ark-bg)] border border-[var(--ark-gold)]/40 rounded px-0.5">
                +{eq.enhancement}
              </span>
            )}
          </>
        ) : (
          <Icon size={16} className="text-[var(--text-ghost)]" />
        )}
        <span className="text-[7px] font-data text-[var(--text-label)] mt-0.5 truncate max-w-full px-0.5">
          {slot.label.split(' ')[0]}
        </span>
      </button>
    )
  }

  // Stat preview from all equipped items
  const equipBonuses: Record<string, number> = {}
  for (const eq of equippedItems) {
    if (!eq.items?.stats) continue
    const factor = 1 + (eq.enhancement * 0.05)
    for (const [k, v] of Object.entries(eq.items.stats)) {
      equipBonuses[k] = (equipBonuses[k] ?? 0) + Math.floor(v * factor)
    }
  }

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
      <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-4">
        Equipamentos
      </h3>

      {/* Equipment Grid with Silhouette */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {/* Left slots */}
        <div className="flex flex-col gap-2">
          {leftSlots.map(renderSlot)}
        </div>

        {/* Silhouette */}
        <div className="w-24 h-36 border border-[var(--ark-border)] rounded-sm bg-[var(--ark-bg)] flex items-center justify-center">
          <svg viewBox="0 0 60 100" className="w-16 h-28 text-[var(--text-ghost)]/30" fill="currentColor">
            <circle cx="30" cy="14" r="10" />
            <rect x="20" y="26" width="20" height="32" rx="4" />
            <rect x="14" y="28" width="6" height="24" rx="3" />
            <rect x="40" y="28" width="6" height="24" rx="3" />
            <rect x="22" y="60" width="7" height="28" rx="3" />
            <rect x="31" y="60" width="7" height="28" rx="3" />
          </svg>
        </div>

        {/* Right slots */}
        <div className="flex flex-col gap-2">
          {rightSlots.map(renderSlot)}
        </div>
      </div>

      {/* Bottom: Weapons */}
      <div className="flex justify-center gap-2 mb-4">
        {bottomSlots.map(renderSlot)}
      </div>

      {/* Stat Preview */}
      {Object.keys(equipBonuses).length > 0 && (
        <div className="border-t border-[var(--ark-border)] pt-3">
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Bônus de Equipamento</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(equipBonuses).map(([stat, bonus]) => (
              <span key={stat} className="text-xs font-data">
                <span className="text-[var(--text-label)] uppercase">{stat.slice(0, 3)}</span>
                {' '}
                <span className="text-status-alive">+{bonus}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Item Selection Modal */}
      {selectedSlot && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedSlot(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 bg-[var(--ark-bg-raised)] border border-[var(--ark-border)] rounded-sm p-5 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-data text-[var(--text-secondary)] uppercase tracking-wider">
                {slotDefinitions.find((s) => s.slot_key === selectedSlot)?.label ?? selectedSlot}
              </h4>
              <button onClick={() => setSelectedSlot(null)} className="text-[var(--text-label)]">
                <X size={16} />
              </button>
            </div>

            {/* Unequip button if slot has item */}
            {equipped[selectedSlot] && (
              <div className="mb-3 pb-3 border-b border-[var(--ark-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-body text-[var(--text-primary)]">
                    {equipped[selectedSlot].items?.name}
                    {equipped[selectedSlot].enhancement > 0 && (
                      <span className="text-[var(--ark-gold-bright)]"> +{equipped[selectedSlot].enhancement}</span>
                    )}
                  </span>
                  <ArkButton variant="danger" size="sm" onClick={() => handleUnequip(selectedSlot)} disabled={loading}>
                    Desequipar
                  </ArkButton>
                </div>
              </div>
            )}

            {compatibleItems.length === 0 ? (
              <p className="text-xs font-body text-[var(--text-label)] italic text-center py-4">
                Nenhum item compatível no inventário.
              </p>
            ) : (
              <ul className="space-y-2">
                {compatibleItems.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between p-3 bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-data font-semibold text-[var(--text-primary)]">
                          {inv.items.name}
                        </span>
                        <ArkBadge color={RARITY_COLORS[inv.items.rarity] ?? 'bronze'} className="text-[7px]">
                          {inv.items.rarity}
                        </ArkBadge>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {Object.entries(inv.items.stats ?? {}).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-data text-status-alive">
                            {k.slice(0, 3).toUpperCase()} +{v}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArkButton size="sm" onClick={() => handleEquip(inv.id, selectedSlot)} disabled={loading}>
                      Equipar
                    </ArkButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Enhance Modal */}
      {enhanceTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setEnhanceTarget(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto z-50 bg-[var(--ark-bg-raised)] border border-[var(--ark-border)] rounded-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-data text-[var(--text-secondary)] uppercase tracking-wider">
                Melhorar Item
              </h4>
              <button onClick={() => setEnhanceTarget(null)} className="text-[var(--text-label)]">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm font-body text-[var(--text-primary)] mb-1">
              {enhanceTarget.name}
            </p>
            <p className="text-xs font-data text-[var(--ark-gold-bright)] mb-3">
              +{enhanceTarget.enhancement} → +{enhanceTarget.enhancement + 1}
            </p>
            <p className="text-xs font-data text-[var(--text-label)] mb-4">
              Saldo: {librasBalance.toLocaleString('pt-BR')} Libras
            </p>
            <ArkButton
              onClick={() => handleEnhance(enhanceTarget.invId)}
              disabled={loading}
              className="w-full"
            >
              <ArrowUp size={14} />
              {loading ? 'Melhorando...' : 'Confirmar Melhoria'}
            </ArkButton>
          </div>
        </>
      )}
    </div>
  )
}

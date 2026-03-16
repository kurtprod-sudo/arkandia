'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import {
  Sword, HardHat, Shirt, Footprints, Gem, Lock, X,
} from 'lucide-react'

const SLOT_ICONS: Record<string, React.ElementType> = {
  arma_principal: Sword, arma_secundaria: Sword,
  elmo: HardHat, armadura: Shirt, calca: Shirt,
  bota: Footprints, acessorio_1: Gem, acessorio_2: Gem,
}

// Positions relative to the silhouette container (400px tall, 360px wide)
const SLOT_POSITIONS: Record<string, { top: string; left: string }> = {
  elmo:            { top: '2%',  left: '50%' },
  arma_principal:  { top: '22%', left: '8%' },
  armadura:        { top: '32%', left: '50%' },
  acessorio_1:     { top: '22%', left: '92%' },
  arma_secundaria: { top: '42%', left: '8%' },
  acessorio_2:     { top: '42%', left: '92%' },
  calca:           { top: '58%', left: '50%' },
  bota:            { top: '80%', left: '50%' },
}

const RARITY_COLORS: Record<string, 'bronze' | 'gold' | 'crimson'> = {
  comum: 'bronze', incomum: 'gold', raro: 'crimson', epico: 'crimson', lendario: 'gold',
}

interface SlotDef {
  slot_key: string; label: string; slot_order: number; is_locked: boolean
}
interface EquippedItem {
  slot_key: string; enhancement: number
  items: { id: string; name: string; description: string; rarity: string; stats: Record<string, number>; slot_type: string } | null
}
interface InvItem {
  id: string; item_id: string; quantity: number
  items: { id: string; name: string; rarity: string; stats: Record<string, number>; slot_type: string; required_level: number }
}

interface Props {
  characterId: string
  slotDefinitions: SlotDef[]
  equippedItems: EquippedItem[]
  inventoryItems: InvItem[]
  librasBalance: number
}

export default function EquipmentSilhouette({
  characterId, slotDefinitions, equippedItems, inventoryItems, librasBalance,
}: Props) {
  const router = useRouter()
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const equipped = Object.fromEntries(equippedItems.map((e) => [e.slot_key, e]))

  const handleEquip = async (inventoryId: string, slotKey: string) => {
    setLoading(true)
    await fetch('/api/equipment/equip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId, inventory_id: inventoryId, slot_key: slotKey }),
    })
    setSelectedSlot(null); setLoading(false); router.refresh()
  }

  const handleUnequip = async (slotKey: string) => {
    setLoading(true)
    await fetch('/api/equipment/unequip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId, slot_key: slotKey }),
    })
    setLoading(false); router.refresh()
  }

  const compatibleItems = selectedSlot
    ? inventoryItems.filter((inv) => {
        const st = inv.items?.slot_type
        if (st === selectedSlot) return true
        if (st?.startsWith('acessorio') && selectedSlot.startsWith('acessorio')) return true
        return false
      })
    : []

  // Stat bonuses preview
  const equipBonuses: Record<string, number> = {}
  for (const eq of equippedItems) {
    if (!eq.items?.stats) continue
    const factor = 1 + (eq.enhancement * 0.05)
    for (const [k, v] of Object.entries(eq.items.stats)) {
      equipBonuses[k] = (equipBonuses[k] ?? 0) + Math.floor(v * factor)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Silhouette with slots */}
      <div className="relative h-[400px] md:h-[420px]">
        {/* SVG Silhouette */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <svg viewBox="0 0 120 280" className="w-[100px] h-[230px] md:w-[120px] md:h-[280px]" fill="none" stroke="var(--ark-border)" strokeWidth="1.5">
            <ellipse cx="60" cy="28" rx="20" ry="24" />
            <path d="M40 52 C38 60, 25 65, 18 80 L22 140 L38 135 L38 52Z" />
            <path d="M80 52 C82 60, 95 65, 102 80 L98 140 L82 135 L82 52Z" />
            <path d="M40 52 L40 165 C40 172, 42 178, 48 180 L60 182 L72 180 C78 178, 80 172, 80 165 L80 52Z" />
            <path d="M42 180 L38 260 L48 262 L55 200Z" />
            <path d="M78 180 L82 260 L72 262 L65 200Z" />
          </svg>
        </div>

        {/* Equipment slots positioned absolutely */}
        {slotDefinitions.map((slot) => {
          const pos = SLOT_POSITIONS[slot.slot_key]
          if (!pos) return null
          const eq = equipped[slot.slot_key]
          const Icon = SLOT_ICONS[slot.slot_key] ?? Gem
          const isLocked = slot.is_locked

          return (
            <button
              key={slot.slot_key}
              onClick={() => !isLocked && setSelectedSlot(slot.slot_key)}
              disabled={isLocked}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all"
              style={{ top: pos.top, left: pos.left }}
              title={isLocked ? `${slot.label} (bloqueado)` : eq?.items ? `${eq.items.name}${eq.enhancement > 0 ? ` +${eq.enhancement}` : ''}` : slot.label}
            >
              <div className={`
                w-14 h-14 rounded-sm border flex flex-col items-center justify-center relative
                ${isLocked
                  ? 'border-[var(--ark-border)]/30 opacity-40 cursor-not-allowed'
                  : eq?.items
                    ? 'border-[var(--ark-gold)]/40 bg-[var(--ark-surface)] hover:border-[var(--ark-gold-bright)] cursor-pointer'
                    : 'border-[var(--ark-border)] bg-[var(--ark-bg)] hover:border-[var(--ark-border-bright)] cursor-pointer'
                }
              `}>
                {isLocked ? (
                  <Lock size={14} className="text-[var(--text-ghost)]" />
                ) : eq?.items ? (
                  <>
                    <Icon size={14} className="text-[var(--ark-gold-bright)]" />
                    {eq.enhancement > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 text-[7px] font-data font-bold text-[var(--ark-gold-bright)] bg-[var(--ark-bg)] border border-[var(--ark-gold)]/40 rounded px-0.5">
                        +{eq.enhancement}
                      </span>
                    )}
                  </>
                ) : (
                  <Icon size={14} className="text-[var(--text-ghost)]" />
                )}
                <span className="text-[6px] font-data text-[var(--text-label)] mt-0.5 truncate max-w-[50px] text-center">
                  {eq?.items ? eq.items.name.split(' ')[0] : slot.label.split(' ')[0]}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Right: Bonus preview + inventory */}
      <div className="space-y-4">
        {Object.keys(equipBonuses).length > 0 && (
          <div className="p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
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

        <div className="p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">
            Inventário ({inventoryItems.length} itens)
          </p>
          {inventoryItems.length > 0 ? (
            <div className="space-y-1 max-h-[250px] overflow-y-auto">
              {inventoryItems.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-2 border border-[var(--ark-border)]/50 rounded-sm text-xs">
                  <div>
                    <span className="font-data text-[var(--text-primary)]">{inv.items.name}</span>
                    <ArkBadge color={RARITY_COLORS[inv.items.rarity] ?? 'bronze'} className="text-[6px] ml-1">
                      {inv.items.rarity}
                    </ArkBadge>
                  </div>
                  <span className="text-[var(--text-ghost)] font-data">×{inv.quantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-body text-[var(--text-label)] italic">Nenhum equipamento no inventário.</p>
          )}
        </div>
      </div>

      {/* Slot selection modal */}
      {selectedSlot && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedSlot(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 bg-[var(--ark-bg-raised)] border border-[var(--ark-border)] rounded-sm p-5 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-data text-[var(--text-secondary)] uppercase tracking-wider">
                {slotDefinitions.find((s) => s.slot_key === selectedSlot)?.label ?? selectedSlot}
              </h4>
              <button onClick={() => setSelectedSlot(null)} className="text-[var(--text-label)]"><X size={16} /></button>
            </div>

            {equipped[selectedSlot] && (
              <div className="mb-3 pb-3 border-b border-[var(--ark-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-body text-[var(--text-primary)]">
                    {equipped[selectedSlot].items?.name}
                    {equipped[selectedSlot].enhancement > 0 && <span className="text-[var(--ark-gold-bright)]"> +{equipped[selectedSlot].enhancement}</span>}
                  </span>
                  <ArkButton variant="danger" size="sm" onClick={() => handleUnequip(selectedSlot)} disabled={loading}>
                    Desequipar
                  </ArkButton>
                </div>
              </div>
            )}

            {compatibleItems.length === 0 ? (
              <p className="text-xs font-body text-[var(--text-label)] italic text-center py-4">Nenhum item compatível.</p>
            ) : (
              <ul className="space-y-2">
                {compatibleItems.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between p-3 bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-data font-semibold text-[var(--text-primary)]">{inv.items.name}</span>
                        <ArkBadge color={RARITY_COLORS[inv.items.rarity] ?? 'bronze'} className="text-[7px]">{inv.items.rarity}</ArkBadge>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {Object.entries(inv.items.stats ?? {}).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-data text-status-alive">{k.slice(0, 3).toUpperCase()} +{v}</span>
                        ))}
                      </div>
                    </div>
                    <ArkButton size="sm" onClick={() => handleEquip(inv.id, selectedSlot)} disabled={loading}>Equipar</ArkButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

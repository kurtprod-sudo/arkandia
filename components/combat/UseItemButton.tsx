'use client'

import { useState, useEffect } from 'react'
import ArkButton from '@/components/ui/ArkButton'

interface Props {
  characterId: string
  onUse: (itemId: string) => void
}

interface ConsumableItem {
  id: string
  itemId: string
  name: string
  quantity: number
}

export default function UseItemButton({ characterId, onUse }: Props) {
  const [items, setItems] = useState<ConsumableItem[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/character/inventory/consumables?character_id=${characterId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
  }, [characterId])

  if (items.length === 0) return null

  return (
    <div className="relative">
      <ArkButton
        variant="secondary"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="text-[10px]"
      >
        Usar Item
      </ArkButton>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-2 space-y-1 z-10 min-w-[160px]">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => { onUse(item.itemId); setOpen(false) }}
              className="w-full text-left text-[10px] font-data text-[var(--text-primary)] hover:text-[var(--ark-red-glow)] py-1 px-2 rounded-sm hover:bg-[var(--ark-bg)] transition-colors"
            >
              {item.name} ×{item.quantity}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

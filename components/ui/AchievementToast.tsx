'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, X } from 'lucide-react'

const RARITY_BORDER: Record<string, string> = {
  comum: 'var(--text-secondary)',
  raro: '#4A90D9',
  epico: '#9B59B6',
  lendario: 'var(--ark-gold-bright)',
}

const RARITY_LABELS: Record<string, string> = {
  comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário',
}

interface ToastItem {
  id: string
  title: string
  rarity: string
  icon: string
  addedAt: number
}

export default function AchievementToast({ characterId }: { characterId: string | null }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((t: ToastItem) => {
    setToasts((prev) => [...prev.slice(-2), t])
  }, [])

  // Auto-dismiss after 5s
  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setInterval(() => {
      setToasts((prev) => prev.filter((t) => Date.now() - t.addedAt < 5000))
    }, 500)
    return () => clearInterval(timer)
  }, [toasts.length])

  // Realtime subscription
  useEffect(() => {
    if (!characterId) return
    const supabase = createClient()
    const channel = supabase
      .channel('achievement-toasts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `character_id=eq.${characterId}`,
        },
        (payload) => {
          const meta = (payload.new as Record<string, unknown>).metadata as Record<string, unknown> | null
          if (meta?.achievement === true) {
            addToast({
              id: (payload.new as Record<string, unknown>).id as string,
              title: (meta.achievementTitle as string) ?? 'Conquista',
              rarity: (meta.rarity as string) ?? 'comum',
              icon: (meta.icon as string) ?? 'trophy',
              addedAt: Date.now(),
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [characterId, addToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => {
        const borderColor = RARITY_BORDER[t.rarity] ?? RARITY_BORDER.comum
        const isLegendary = t.rarity === 'lendario'

        return (
          <div
            key={t.id}
            className="animate-[slide-in-right_300ms_ease-out] bg-[var(--ark-bg-raised)] border border-[var(--ark-border)] rounded-sm p-3 min-w-[280px] max-w-[340px] flex items-start gap-3 shadow-2xl"
            style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
          >
            <style>{`
              @keyframes slide-in-right { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
              ${isLegendary ? `@keyframes ach-glow { 0%,100%{box-shadow:0 0 4px ${borderColor}40} 50%{box-shadow:0 0 12px ${borderColor}80} }` : ''}
            `}</style>
            <div
              className="shrink-0 mt-0.5"
              style={isLegendary ? { animation: 'ach-glow 2s ease-in-out infinite' } : undefined}
            >
              <Trophy size={20} style={{ color: borderColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-data text-[var(--text-label)] uppercase tracking-[0.2em]">
                Conquista Desbloqueada
              </p>
              <p className="text-xs font-display font-bold text-[var(--text-primary)] mt-0.5 truncate">
                {t.title}
              </p>
              <span className="text-[8px] font-data uppercase tracking-wider" style={{ color: borderColor }}>
                {RARITY_LABELS[t.rarity] ?? t.rarity}
              </span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-[var(--text-ghost)] hover:text-[var(--text-label)] shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

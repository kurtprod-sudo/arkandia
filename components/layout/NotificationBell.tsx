'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, Compass, Swords, Mail, Users, Shield, Flame,
  TrendingUp, Target, Sparkles, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NotificationType } from '@/types'

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  expedition_done:    Compass,
  duel_received:      Swords,
  letter_received:    Mail,
  dungeon_invite:     Users,
  society_invite:     Shield,
  war_declared:       Flame,
  level_up:           TrendingUp,
  hunting_done:       Target,
  resonance_unlocked: Sparkles,
  general:            Bell,
}

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string
  is_read: boolean
  action_url: string | null
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

interface NotificationBellProps {
  characterId: string | null
  expanded?: boolean
}

export default function NotificationBell({ characterId, expanded = false }: NotificationBellProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!characterId) return
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?page=1')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [characterId])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription
  useEffect(() => {
    if (!characterId) return

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `character_id=eq.${characterId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem
          setNotifications((prev) => [newNotif, ...prev].slice(0, 30))
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [characterId])

  const handleMarkRead = async (notifId: string) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: notifId }),
    })
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleClick = async (notif: NotificationItem) => {
    if (!notif.is_read) await handleMarkRead(notif.id)
    if (notif.action_url) {
      setOpen(false)
      router.push(notif.action_url)
    }
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications() }}
        className={`
          relative flex items-center gap-2 transition-colors
          text-[var(--text-secondary)] hover:text-[var(--text-primary)]
          ${expanded ? 'px-2 py-1.5' : 'p-1.5'}
        `}
      >
        <Bell size={18} />
        {expanded && (
          <span className="text-xs font-data tracking-wider uppercase">Notificações</span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-data font-bold bg-[var(--ark-red)] text-white rounded-full px-1 border border-[var(--ark-bg)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 md:left-full md:top-0 md:ml-2 top-full mt-1 z-50 w-[340px] max-h-[480px] bg-[var(--ark-bg-raised)] border border-[var(--ark-border)] rounded-sm shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ark-border)]">
              <span className="text-xs font-data tracking-wider uppercase text-[var(--text-secondary)]">
                Notificações
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-data text-[var(--text-label)] hover:text-[var(--text-secondary)] transition-colors uppercase tracking-wider"
                  >
                    Marcar todas
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[var(--text-label)] hover:text-[var(--text-secondary)]">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <p className="text-center text-[var(--text-label)] text-xs py-8 font-body">Carregando...</p>
              ) : notifications.length === 0 ? (
                <p className="text-center text-[var(--text-label)] text-xs py-8 font-body italic">
                  Nenhuma notificação.
                </p>
              ) : (
                notifications.map((notif) => {
                  const Icon = TYPE_ICONS[notif.type] ?? Bell
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={`
                        w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
                        border-b border-[var(--ark-border)]/50 last:border-0
                        ${notif.is_read
                          ? 'opacity-60 hover:opacity-80'
                          : 'hover:bg-[var(--ark-surface)]'
                        }
                      `}
                    >
                      <div className="mt-0.5 shrink-0">
                        <Icon size={16} className="text-[var(--text-label)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ark-red-glow)] shrink-0" />
                          )}
                          <span className="text-xs font-data font-semibold text-[var(--text-primary)] truncate">
                            {notif.title}
                          </span>
                        </div>
                        <p className="text-[11px] font-body text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                          {notif.body}
                        </p>
                        <span className="text-[10px] font-data text-[var(--text-label)] mt-1 block">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--ark-border)] px-4 py-2">
              <a
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-[10px] font-data text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors tracking-wider uppercase"
              >
                Ver histórico completo →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, User, Globe, Swords, MessageCircle, Sword,
  Hammer, Shield, Sparkles, ShoppingBag,
  Trophy, Gem, Calendar, ChevronLeft, ChevronRight, Menu, X,
} from 'lucide-react'
import NotificationBell from './NotificationBell'

const NAV_ITEMS = [
  { label: 'Home',       href: '/home',      icon: Home          },
  { label: 'Personagem', href: '/character',  icon: User          },
  { label: 'Building',   href: '/building',   icon: Sword         },
  { label: 'Mundo',      href: '/world',      icon: Globe         },
  { label: 'Batalha',    href: '/battle',     icon: Swords        },
  { label: 'Lobby',      href: '/lobby',      icon: MessageCircle },
  { label: 'Crafting',   href: '/crafting',   icon: Hammer        },
  { label: 'Sociedade',  href: '/society',    icon: Shield        },
  { label: 'Santuário',  href: '/sanctuary',  icon: Sparkles      },
  { label: 'Bazaar',     href: '/market',     icon: ShoppingBag   },
  { label: 'Rankings',   href: '/rankings',   icon: Trophy        },
  { label: 'Loja',       href: '/shop',       icon: Gem           },
  { label: 'Eventos',    href: '/events',     icon: Calendar      },
]

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 4) // Home, Personagem, Mundo, Batalha

interface AppShellProps {
  children: React.ReactNode
  characterId: string | null
  characterInitial: string
  isGm: boolean
}

export default function AppShell({
  children,
  characterId,
  characterInitial,
  isGm,
}: AppShellProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen flex">
      {/* ─── SIDEBAR (desktop md+) ─── */}
      <aside
        className={`
          hidden md:flex flex-col fixed left-0 top-0 h-full z-40
          bg-[var(--ark-bg)] border-r border-[var(--ark-border)]
          transition-all duration-200 ease-out
          ${expanded ? 'w-[220px]' : 'w-16'}
        `}
      >
        {/* Logo / Avatar */}
        <div className="flex items-center justify-center h-16 border-b border-[var(--ark-border)] shrink-0">
          {expanded ? (
            <Link href="/home" className="font-display text-[var(--ark-gold-bright)] text-lg">
              Arkandia
            </Link>
          ) : (
            <Link
              href="/home"
              className="w-9 h-9 rounded-full bg-[#6e160f]/30 border border-[var(--ark-border-bright)] flex items-center justify-center text-sm font-display font-bold text-[var(--text-primary)]"
            >
              {characterInitial}
            </Link>
          )}
        </div>

        {/* Notification Bell */}
        <div className={`flex items-center ${expanded ? 'px-3' : 'justify-center'} py-3 border-b border-[var(--ark-border)]`}>
          <NotificationBell characterId={characterId} expanded={expanded} />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`
                  flex items-center gap-3 mx-2 my-0.5 rounded-sm transition-all duration-150
                  ${expanded ? 'px-3 py-2.5' : 'justify-center py-2.5'}
                  ${active
                    ? 'bg-[var(--ark-surface)] text-[var(--ark-gold-bright)] border border-[var(--ark-border-bright)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--ark-surface)] border border-transparent'
                  }
                `}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                {expanded && (
                  <span className="text-xs font-data tracking-wider uppercase truncate">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* GM Link */}
        {isGm && (
          <div className={`border-t border-[var(--ark-border)] ${expanded ? 'px-3' : 'flex justify-center'} py-3`}>
            <Link
              href="/gm"
              className={`
                flex items-center gap-2 text-xs font-data text-[var(--ark-red-glow)]
                hover:text-[var(--ark-red-glow)]/80 transition-colors
                ${!expanded && 'justify-center'}
              `}
            >
              <Shield size={16} />
              {expanded && <span className="tracking-wider uppercase">Painel GM</span>}
            </Link>
          </div>
        )}

        {/* Expand Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center h-10 border-t border-[var(--ark-border)] text-[var(--text-label)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className={`flex-1 transition-all duration-200 ${expanded ? 'md:ml-[220px]' : 'md:ml-16'} pb-20 md:pb-0`}>
        {children}
      </main>

      {/* ─── BOTTOM BAR (mobile, até md) ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 z-40 bg-[var(--ark-bg)] border-t border-[var(--ark-border)] flex items-center justify-around px-1">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-sm transition-colors min-w-[56px]
                ${active
                  ? 'text-[var(--ark-gold-bright)]'
                  : 'text-[var(--text-label)] hover:text-[var(--text-secondary)]'
                }
              `}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[9px] font-data tracking-wider uppercase">{item.label}</span>
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`
            flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-sm transition-colors min-w-[56px]
            ${moreOpen
              ? 'text-[var(--ark-gold-bright)]'
              : 'text-[var(--text-label)] hover:text-[var(--text-secondary)]'
            }
          `}
        >
          {moreOpen ? <X size={20} /> : <Menu size={20} />}
          <span className="text-[9px] font-data tracking-wider uppercase">Mais</span>
        </button>
      </nav>

      {/* ─── MOBILE DRAWER ─── */}
      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-30"
            onClick={() => setMoreOpen(false)}
          />
          <div className="md:hidden fixed bottom-16 left-0 w-full z-35 bg-[var(--ark-bg)] border-t border-[var(--ark-border)] rounded-t-lg p-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-4 gap-3">
              {NAV_ITEMS.slice(4).map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`
                      flex flex-col items-center gap-1.5 py-3 px-1 rounded-sm transition-colors
                      ${active
                        ? 'text-[var(--ark-gold-bright)] bg-[var(--ark-surface)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--ark-surface)]'
                      }
                    `}
                  >
                    <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                    <span className="text-[10px] font-data tracking-wider uppercase text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>

            {/* Notification + GM in drawer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--ark-border)]">
              <NotificationBell characterId={characterId} expanded={true} />
              {isGm && (
                <Link
                  href="/gm"
                  onClick={() => setMoreOpen(false)}
                  className="text-xs font-data text-[var(--ark-red-glow)] tracking-wider uppercase"
                >
                  Painel GM
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

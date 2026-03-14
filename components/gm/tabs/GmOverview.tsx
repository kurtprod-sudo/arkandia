'use client'

import ArkBadge from '@/components/ui/ArkBadge'
import type { CharacterWithAttributes, GameEvent } from '@/types'

interface Props {
  characters: CharacterWithAttributes[]
  events: GameEvent[]
  societies: Array<{ id: string; name: string }>
  territories: Array<{ controlling_society_id: string | null }>
  activeWars: Array<{ id: string }>
  recentPayments: Array<{ status: string; amount_brl: number; gemas_amount: number; created_at: string }>
}

const EVENT_BADGE: Record<string, 'crimson' | 'gold' | 'alive' | 'injured' | 'archetype' | 'capitania'> = {
  combat_started: 'crimson',
  combat_finished: 'crimson',
  war_declared: 'injured',
  war_finished: 'injured',
  society_founded: 'gold',
  society_joined: 'gold',
  society_dissolved: 'gold',
  payment_created: 'alive',
  payment_approved: 'alive',
  title_granted: 'capitania',
}

export default function GmOverview({ characters, events, societies, territories, activeWars, recentPayments }: Props) {
  const activeChars = characters.filter((c) => c.status === 'active').length
  const controlledTerritories = territories.filter((t) => t.controlling_society_id !== null).length

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyRevenue = recentPayments
    .filter((p) => p.status === 'approved' && new Date(p.created_at) >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount_brl), 0)

  const totalGemas = characters.reduce((sum, c) => {
    const wallet = c.character_wallet
    return sum + (wallet?.premium_currency ?? 0)
  }, 0)

  const stats = [
    { label: 'Personagens Ativos', value: String(activeChars) },
    { label: 'Sociedades', value: String(societies.length) },
    { label: 'Territorios', value: `${controlledTerritories}/${territories.length}` },
    { label: 'Guerras Ativas', value: String(activeWars.length) },
    { label: 'Receita no Mes', value: `R$ ${monthlyRevenue.toFixed(2).replace('.', ',')}` },
    { label: 'Gemas em Circulacao', value: totalGemas.toLocaleString('pt-BR') },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 text-center">
            <p className="font-data text-lg font-bold text-[var(--text-primary)]">{s.value}</p>
            <p className="font-body text-[10px] text-[var(--text-label)] uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Event feed */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
        <h3 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Ultimos 50 Eventos
        </h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 text-sm border-b border-[var(--ark-border)] pb-2 last:border-0">
              <ArkBadge color={EVENT_BADGE[event.type] ?? 'crimson'} className="text-[9px] shrink-0 mt-0.5">
                {event.type.replace(/_/g, ' ')}
              </ArkBadge>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-secondary)] font-body truncate">
                  {event.narrative_text ?? event.type}
                </p>
                <p className="text-[var(--text-ghost)] text-xs font-data mt-0.5">
                  {new Date(event.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-[var(--text-label)] text-sm font-body italic">Nenhum evento registrado.</p>
          )}
        </div>
      </div>
    </div>
  )
}

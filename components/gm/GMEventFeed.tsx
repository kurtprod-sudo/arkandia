'use client'

import { type GameEvent } from '@/types'

interface Props {
  events: GameEvent[]
}

const EVENT_COLORS: Record<string, string> = {
  character_created: 'text-status-alive',
  level_up: 'text-[var(--ark-gold-bright)]',
  battle_result: 'text-attr-ataque',
  currency_granted: 'text-[var(--ark-gold-bright)]',
  gm_override: 'text-[var(--ark-red-glow)]',
  attribute_distributed: 'text-attr-eter',
  archetype_chosen: 'text-attr-capitania',
  class_chosen: 'text-attr-magia',
  narrative_action: 'text-[var(--ark-gold-bright)]',
}

export default function GMEventFeed({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-[var(--text-label)] text-sm font-body italic">Nenhum evento registrado.</p>
  }

  return (
    <div className="bg-[var(--ark-bg-raised)] rounded-xl border border-[var(--ark-gold-dim)] overflow-hidden">
      <div className="overflow-y-auto max-h-[600px]">
        {events.map((event) => (
          <div
            key={event.id}
            className="px-4 py-3 border-b border-[#7a5a18]/40 last:border-0"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`text-xs font-data font-semibold shrink-0 ${
                  EVENT_COLORS[event.type] ?? 'text-[var(--text-label)]'
                }`}
              >
                {event.type}
              </span>
              <span className="text-[var(--text-label)] text-xs shrink-0 font-data">
                {new Date(event.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {event.narrative_text && (
              <p className="text-[var(--text-secondary)] text-xs mt-1 font-body">{event.narrative_text}</p>
            )}
            {Object.keys(event.metadata).length > 0 && (
              <pre className="text-[var(--text-label)] text-xs mt-1 overflow-hidden text-ellipsis whitespace-nowrap font-data">
                {JSON.stringify(event.metadata)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

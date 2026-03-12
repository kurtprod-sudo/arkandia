'use client'

import { type GameEvent } from '@/types'

interface Props {
  events: GameEvent[]
}

const EVENT_COLORS: Record<string, string> = {
  character_created: 'text-green-400',
  level_up: 'text-amber-400',
  battle_result: 'text-red-400',
  currency_granted: 'text-yellow-400',
  gm_override: 'text-purple-400',
  attribute_distributed: 'text-blue-400',
  archetype_chosen: 'text-purple-400',
  class_chosen: 'text-blue-400',
  narrative_action: 'text-amber-300',
}

export default function GMEventFeed({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-neutral-600 text-sm">Nenhum evento registrado.</p>
  }

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
      <div className="overflow-y-auto max-h-[600px]">
        {events.map((event) => (
          <div
            key={event.id}
            className="px-4 py-3 border-b border-neutral-800 last:border-0"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`text-xs font-mono font-semibold shrink-0 ${
                  EVENT_COLORS[event.type] ?? 'text-neutral-400'
                }`}
              >
                {event.type}
              </span>
              <span className="text-neutral-600 text-xs shrink-0">
                {new Date(event.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {event.narrative_text && (
              <p className="text-neutral-300 text-xs mt-1">{event.narrative_text}</p>
            )}
            {Object.keys(event.metadata).length > 0 && (
              <pre className="text-neutral-600 text-xs mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {JSON.stringify(event.metadata)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

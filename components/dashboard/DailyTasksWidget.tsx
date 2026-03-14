'use client'

import { useState } from 'react'
import type { DailyTask } from '@/types'
import ArkButton from '@/components/ui/ArkButton'

interface DailyTasksWidgetProps {
  tasks: DailyTask[]
  completedCount: number
  ticketGranted: boolean
  characterId: string
  streak: number
}

// Tasks completadas automaticamente por outros sistemas
const AUTO_TASKS = new Set(['desafio', 'faccao'])

export default function DailyTasksWidget({
  tasks: initialTasks,
  completedCount: initialCount,
  ticketGranted: initialTicket,
  characterId,
  streak,
}: DailyTasksWidgetProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [completedCount, setCompletedCount] = useState(initialCount)
  const [ticketGranted, setTicketGranted] = useState(initialTicket)
  const [loading, setLoading] = useState<string | null>(null)

  const handleComplete = async (taskType: string) => {
    setLoading(taskType)
    try {
      const res = await fetch('/api/daily/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, task_type: taskType }),
      })
      const data = await res.json()
      if (data.success) {
        setTasks((prev) =>
          prev.map((t) => (t.type === taskType ? { ...t, completed: true } : t))
        )
        setCompletedCount((c) => c + 1)
        if (data.ticketGranted) setTicketGranted(true)
      }
    } finally {
      setLoading(null)
    }
  }

  const progressPercent = (completedCount / 5) * 100

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider">
          Tarefas Di&aacute;rias
        </h2>
        {streak > 0 && (
          <span className="font-data text-xs text-[var(--ark-amber)] tracking-[0.1em]">
            {streak} {streak === 1 ? 'dia' : 'dias'} consecutivos
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-data text-[10px] text-[var(--text-label)] tracking-[0.15em] uppercase">
            Progresso
          </span>
          <span className="font-data text-[10px] text-[var(--text-label)] tracking-[0.15em]">
            {completedCount} / 5
          </span>
        </div>
        <div className="h-1.5 bg-[#1a0808] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--ark-red-glow)] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Ticket banner */}
      {ticketGranted && (
        <div className="mb-4 p-3 rounded-md border border-[var(--ark-gold)]/30 bg-[var(--ark-gold)]/5">
          <p className="font-data text-xs text-[var(--ark-gold-bright)] tracking-[0.1em] text-center uppercase">
            Ticket de Summon obtido!
          </p>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const isAuto = AUTO_TASKS.has(task.type)
          const isLoading = loading === task.type

          return (
            <div
              key={task.type}
              className={`flex items-center gap-3 py-2 px-3 rounded-md border transition-colors ${
                task.completed
                  ? 'border-green-800/20 bg-green-950/10'
                  : 'border-[#1a0808]/30 bg-transparent'
              }`}
            >
              {/* Check indicator */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  task.completed
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-[var(--text-ghost)]'
                }`}
              >
                {task.completed && (
                  <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <p className={`font-body text-sm ${task.completed ? 'text-[var(--text-ghost)] line-through' : 'text-[var(--text-primary)]'}`}>
                  {task.label}
                </p>
                <p className="font-body text-xs text-[var(--text-label)] truncate">
                  {task.description}
                </p>
              </div>

              {/* Action */}
              {!task.completed && (
                isAuto ? (
                  <span className="font-data text-[10px] text-[var(--text-ghost)] tracking-[0.15em] uppercase flex-shrink-0">
                    Autom&aacute;tica
                  </span>
                ) : (
                  <ArkButton
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleComplete(task.type)}
                  >
                    {isLoading ? '...' : 'Completar'}
                  </ArkButton>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

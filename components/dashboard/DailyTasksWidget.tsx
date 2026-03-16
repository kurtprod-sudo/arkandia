'use client'

import type { DailyTask } from '@/types'

interface DailyTasksWidgetProps {
  tasks: DailyTask[]
  completedCount: number
  ticketGranted: boolean
  characterId: string
  streak: number
}

const TASK_HOW_TO: Record<string, string> = {
  complete_expedition: 'Complete uma expedição',
  win_pvp:             'Vença um duelo',
  hunting_kills:       'Abata 5 criaturas em hunting',
  complete_dungeon:    'Participe de uma dungeon',
  send_letter:         'Envie uma carta',
  write_diary:         'Escreva no diário',
  join_scenario:       'Entre em um cenário social',
  craft_item:          'Produza um item',
  login_streak:        'Completada automaticamente',
  use_summon:          'Realize uma invocação',
  mercado_volatil:     'Compre o item da Loja NPC',
  eco_arquetipo:       'Leia o Eco do Arquétipo',
}

export default function DailyTasksWidget({
  tasks,
  completedCount,
  ticketGranted,
  streak,
}: DailyTasksWidgetProps) {
  const progressPercent = (completedCount / 5) * 100

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider">
          Tarefas Diárias
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
          const rewardParts: string[] = []
          if (task.xp_reward > 0) rewardParts.push(`+${task.xp_reward} XP`)
          if (task.essencia_reward > 0) rewardParts.push(`+${task.essencia_reward} Ess`)
          if (task.libras_reward > 0) rewardParts.push(`+${task.libras_reward} £`)
          const rewardStr = rewardParts.join(' · ')

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
                  {task.completed ? task.description : (TASK_HOW_TO[task.type] ?? task.description)}
                </p>
                {rewardStr && (
                  <p className={`font-data text-[10px] mt-0.5 ${task.completed ? 'text-status-alive' : 'text-[var(--text-ghost)]'}`}>
                    {rewardStr}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

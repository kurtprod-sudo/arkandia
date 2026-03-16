import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'
import { grantXp } from './levelup'
import type { Json } from '@/types/database.types'

export type TaskType =
  | 'complete_expedition'
  | 'win_pvp'
  | 'hunting_kills'
  | 'complete_dungeon'
  | 'send_letter'
  | 'write_diary'
  | 'join_scenario'
  | 'craft_item'
  | 'login_streak'
  | 'use_summon'

export interface DailyTask {
  type: TaskType
  label: string
  description: string
  completed: boolean
  xp_reward: number
  essencia_reward: number
  libras_reward: number
}

interface TaskDefinition {
  label: string
  description: string
  xp_reward: number
  essencia_reward: number
  libras_reward: number
  auto_complete?: boolean
}

const TASK_DEFINITIONS: Record<TaskType, TaskDefinition> = {
  complete_expedition: {
    label: 'Expedicionário',
    description: 'Complete 1 expedição (qualquer nível de risco).',
    xp_reward: 30, essencia_reward: 5, libras_reward: 0,
  },
  win_pvp: {
    label: 'Duelo',
    description: 'Vença 1 duelo livre ou ranqueado.',
    xp_reward: 40, essencia_reward: 8, libras_reward: 0,
  },
  hunting_kills: {
    label: 'Caçador',
    description: 'Abata 5 criaturas em zonas de caça.',
    xp_reward: 35, essencia_reward: 6, libras_reward: 20,
  },
  complete_dungeon: {
    label: 'Explorador',
    description: 'Participe de 1 dungeon (qualquer dificuldade).',
    xp_reward: 50, essencia_reward: 10, libras_reward: 0,
  },
  send_letter: {
    label: 'Correspondente',
    description: 'Envie 1 carta para outro personagem.',
    xp_reward: 20, essencia_reward: 3, libras_reward: 0,
  },
  write_diary: {
    label: 'Cronista',
    description: 'Escreva 1 entrada no seu diário.',
    xp_reward: 20, essencia_reward: 3, libras_reward: 0,
  },
  join_scenario: {
    label: 'Presença Social',
    description: 'Entre em 1 cenário social.',
    xp_reward: 15, essencia_reward: 2, libras_reward: 10,
  },
  craft_item: {
    label: 'Artesão',
    description: 'Produza 1 item via crafting.',
    xp_reward: 25, essencia_reward: 4, libras_reward: 0,
  },
  login_streak: {
    label: 'Presença Constante',
    description: 'Login diário — concluída automaticamente.',
    xp_reward: 20, essencia_reward: 2, libras_reward: 0,
    auto_complete: true,
  },
  use_summon: {
    label: 'Invocador',
    description: 'Realize 1 invocação no Santuário.',
    xp_reward: 15, essencia_reward: 2, libras_reward: 0,
  },
}

const ALL_TASK_TYPES: TaskType[] = Object.keys(TASK_DEFINITIONS) as TaskType[]

/**
 * Sorteia 5 tasks do pool de 10.
 * Tasks com auto_complete são marcadas como concluídas ao gerar.
 */
function drawDailyTasks(): DailyTask[] {
  const shuffled = [...ALL_TASK_TYPES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 5).map((type) => {
    const def = TASK_DEFINITIONS[type]
    return {
      type,
      label: def.label,
      description: def.description,
      completed: !!def.auto_complete,
      xp_reward: def.xp_reward,
      essencia_reward: def.essencia_reward,
      libras_reward: def.libras_reward,
    }
  })
}

/**
 * Retorna as daily tasks do dia para um personagem.
 * Se não existirem, sorteia e cria.
 */
export async function getDailyTasks(characterId: string): Promise<{
  tasks: DailyTask[]
  completedCount: number
  ticketGranted: boolean
  taskDate: string
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('character_id', characterId)
    .eq('task_date', today)
    .maybeSingle()

  if (existing) {
    return {
      tasks: existing.tasks as unknown as DailyTask[],
      completedCount: existing.completed_count,
      ticketGranted: existing.ticket_granted,
      taskDate: existing.task_date,
    }
  }

  // Cria tasks do dia
  const tasks = drawDailyTasks()
  const autoCompletedCount = tasks.filter((t) => t.completed).length

  await supabase
    .from('daily_tasks')
    .insert({
      character_id: characterId,
      task_date: today,
      tasks: tasks as unknown as Json,
      completed_count: autoCompletedCount,
      ticket_granted: false,
    })

  return {
    tasks,
    completedCount: autoCompletedCount,
    ticketGranted: false,
    taskDate: today,
  }
}

/**
 * Marca uma task como completa.
 * Se 5/5 completas, concede Ticket de Summon.
 */
export async function completeTask(
  characterId: string,
  taskType: TaskType
): Promise<{
  success: boolean
  error?: string
  allCompleted?: boolean
  ticketGranted?: boolean
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: daily } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('character_id', characterId)
    .eq('task_date', today)
    .single()

  if (!daily) return { success: false, error: 'Tasks do dia não encontradas.' }

  const tasks = daily.tasks as unknown as DailyTask[]
  const task = tasks.find((t) => t.type === taskType)

  if (!task) return { success: false, error: 'Task não encontrada.' }
  if (task.completed) return { success: false, error: 'Task já completada.' }

  // Marca como completa
  task.completed = true
  const newCount = daily.completed_count + 1
  const allCompleted = newCount >= 5
  let ticketGranted = daily.ticket_granted

  // Concede recompensas individuais da task
  const def = TASK_DEFINITIONS[taskType]
  if (def.xp_reward > 0) {
    await grantXp(characterId, def.xp_reward)
  }
  if (def.essencia_reward > 0 || def.libras_reward > 0) {
    const { data: wallet } = await supabase
      .from('character_wallet')
      .select('essencia, libras')
      .eq('character_id', characterId)
      .single()
    if (wallet) {
      await supabase
        .from('character_wallet')
        .update({
          essencia: wallet.essencia + def.essencia_reward,
          libras: wallet.libras + def.libras_reward,
        })
        .eq('character_id', characterId)
    }
  }

  // Concede ticket se 5/5 e ainda não concedeu
  if (allCompleted && !ticketGranted) {
    ticketGranted = true
    const { grantSummonTicket } = await import('./summon')
    await grantSummonTicket(characterId)

    await createEvent(supabase, {
      type: 'daily_ticket_granted',
      actorId: characterId,
      metadata: { task_date: today },
      isPublic: false,
      narrativeText: 'Todas as tarefas do dia completas. Ticket de Summon obtido.',
    })
  }

  await supabase
    .from('daily_tasks')
    .update({
      tasks: tasks as unknown as Json,
      completed_count: newCount,
      ticket_granted: ticketGranted,
    })
    .eq('character_id', characterId)
    .eq('task_date', today)

  await createEvent(supabase, {
    type: 'daily_task_completed',
    actorId: characterId,
    metadata: { task_type: taskType, tasks_completed: newCount },
    isPublic: false,
    narrativeText: `Tarefa diária completada: ${def.label}.`,
  })

  return { success: true, allCompleted, ticketGranted }
}

/**
 * Atualiza o login streak do personagem.
 * Chamado ao carregar o dashboard.
 */
export async function updateLoginStreak(characterId: string): Promise<{
  currentStreak: number
  isNewDay: boolean
  streakBroken: boolean
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: streak } = await supabase
    .from('login_streak')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  if (!streak) {
    // Primeiro login
    await supabase
      .from('login_streak')
      .insert({
        character_id: characterId,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today,
        total_logins: 1,
      })
    return { currentStreak: 1, isNewDay: true, streakBroken: false }
  }

  if (streak.last_login_date === today) {
    // Já logou hoje
    return {
      currentStreak: streak.current_streak,
      isNewDay: false,
      streakBroken: false,
    }
  }

  const lastLogin = new Date(streak.last_login_date ?? '2000-01-01')
  const todayDate = new Date(today)
  const diffDays = Math.floor(
    (todayDate.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
  )

  const streakBroken = diffDays > 1
  const newStreak = streakBroken ? 1 : streak.current_streak + 1
  const longestStreak = Math.max(streak.longest_streak, newStreak)

  await supabase
    .from('login_streak')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_login_date: today,
      total_logins: streak.total_logins + 1,
    })
    .eq('character_id', characterId)

  // Recompensa de streak a cada 30 dias
  if (newStreak % 30 === 0) {
    await createEvent(supabase, {
      type: 'streak_milestone',
      actorId: characterId,
      metadata: { streak: newStreak },
      isPublic: true,
      narrativeText: `${newStreak} dias consecutivos em Arkandia. O mundo nota sua presença.`,
    })
  }

  return { currentStreak: newStreak, isNewDay: true, streakBroken }
}

/**
 * Retorna o streak atual do personagem.
 */
export async function getLoginStreak(characterId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('login_streak')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()
  return data
}

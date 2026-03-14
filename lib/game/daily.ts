import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'
import type { Json } from '@/types/database.types'

export type TaskType =
  | 'jornal'
  | 'treino'
  | 'coletar'
  | 'desafio'
  | 'faccao'
  | 'mercado_volatil'
  | 'eco_arquetipo'

export interface DailyTask {
  type: TaskType
  label: string
  description: string
  completed: boolean
}

const TASK_DEFINITIONS: Record<TaskType, { label: string; description: string }> = {
  jornal: {
    label: 'Ler o Jornal',
    description: 'Leia a edição de hoje da Gazeta do Horizonte.',
  },
  treino: {
    label: 'Treino Diário',
    description: 'Complete uma expedição de qualquer tipo.',
  },
  coletar: {
    label: 'Coleta de Recursos',
    description: 'Colete recursos de produção passiva.',
  },
  desafio: {
    label: 'Desafio do Dia',
    description: 'Vença um duelo PvP ranqueado.',
  },
  faccao: {
    label: 'Missão de Facção',
    description: 'Complete uma missão de facção.',
  },
  mercado_volatil: {
    label: 'Mercado Volátil',
    description: 'Faça uma transação no Bazaar ou Leilão.',
  },
  eco_arquetipo: {
    label: 'Eco do Arquétipo',
    description: 'Consulte o Eco do seu Arquétipo de Ressonância.',
  },
}

const ALL_TASK_TYPES: TaskType[] = [
  'jornal', 'treino', 'coletar', 'desafio',
  'faccao', 'mercado_volatil', 'eco_arquetipo',
]

/**
 * Sorteia 5 tasks do pool de 7.
 */
function drawDailyTasks(): DailyTask[] {
  const shuffled = [...ALL_TASK_TYPES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 5).map((type) => ({
    type,
    label: TASK_DEFINITIONS[type].label,
    description: TASK_DEFINITIONS[type].description,
    completed: false,
  }))
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
  await supabase
    .from('daily_tasks')
    .insert({
      character_id: characterId,
      task_date: today,
      tasks: tasks as unknown as Json,
      completed_count: 0,
      ticket_granted: false,
    })

  return {
    tasks,
    completedCount: 0,
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

  // Concede ticket se 5/5 e ainda não concedeu
  if (allCompleted && !ticketGranted) {
    ticketGranted = true
    // Registra como evento — sistema de summon será implementado na Fase 15
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
    narrativeText: `Tarefa diária completada: ${TASK_DEFINITIONS[taskType].label}.`,
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

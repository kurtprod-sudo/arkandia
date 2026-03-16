// ---------------------------------------------------------------------------
// Missões Semanais — Fase 29
// Referência: GDD_Sistemas §6.10
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'
import { grantXp } from './levelup'

export type WeeklyMissionType =
  | 'complete_dungeons' | 'win_pvp_ranked' | 'complete_expeditions'
  | 'hunting_kills' | 'send_letters' | 'complete_daily_tasks'
  | 'bazaar_trades' | 'win_war_battle' | 'recruit_troops'
  | 'complete_troop_expedition'

export type WeeklyMissionDifficulty = 'facil' | 'medio' | 'dificil'

export interface WeeklyMissionEntry {
  type: WeeklyMissionType
  label: string
  description: string
  difficulty: WeeklyMissionDifficulty
  target: number
  progress: number
  completed: boolean
  reward_claimed: boolean
  xp_reward: number
  essencias_reward: number
  libras_reward: number
}

export interface WeeklyMissionsRecord {
  id: string
  characterId: string
  weekStart: string
  missions: WeeklyMissionEntry[]
  completedCount: number
  ticketGranted: boolean
  earlyBonusClaimed: boolean
}

const WEEKLY_MISSION_POOL: Omit<WeeklyMissionEntry, 'progress' | 'completed' | 'reward_claimed'>[] = [
  { type: 'complete_dungeons', label: 'Mergulhador', description: 'Complete 3 dungeons.', difficulty: 'medio', target: 3, xp_reward: 100, essencias_reward: 25, libras_reward: 300 },
  { type: 'win_pvp_ranked', label: 'Sangue no Campo', description: 'Vença 5 duelos ranqueados.', difficulty: 'medio', target: 5, xp_reward: 100, essencias_reward: 25, libras_reward: 300 },
  { type: 'complete_expeditions', label: 'Horizonte Distante', description: 'Complete 4 expedições.', difficulty: 'facil', target: 4, xp_reward: 50, essencias_reward: 10, libras_reward: 100 },
  { type: 'hunting_kills', label: 'Caçada Semanal', description: 'Derrote 50 inimigos em hunting.', difficulty: 'medio', target: 50, xp_reward: 100, essencias_reward: 25, libras_reward: 300 },
  { type: 'send_letters', label: 'Correspondente', description: 'Envie 3 cartas.', difficulty: 'facil', target: 3, xp_reward: 50, essencias_reward: 10, libras_reward: 100 },
  { type: 'complete_daily_tasks', label: 'Disciplinado', description: 'Complete todas as daily tasks por 3 dias.', difficulty: 'facil', target: 3, xp_reward: 50, essencias_reward: 10, libras_reward: 100 },
  { type: 'bazaar_trades', label: 'Negociante', description: 'Realize 5 transações no Bazaar.', difficulty: 'facil', target: 5, xp_reward: 50, essencias_reward: 10, libras_reward: 100 },
  { type: 'win_war_battle', label: 'Veterano de Campo', description: 'Vença 2 batalhas de guerra.', difficulty: 'dificil', target: 2, xp_reward: 200, essencias_reward: 50, libras_reward: 600 },
  { type: 'recruit_troops', label: 'General', description: 'Recrute 3 lotes de tropas.', difficulty: 'medio', target: 3, xp_reward: 100, essencias_reward: 25, libras_reward: 300 },
  { type: 'complete_troop_expedition', label: 'Comandante', description: 'Complete 2 expedições com tropas.', difficulty: 'dificil', target: 2, xp_reward: 200, essencias_reward: 50, libras_reward: 600 },
]

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export { getWeekStart, isBeforeThursday } from '@/lib/utils/formulas'

function isWeeklyMissionEntry(val: unknown): val is WeeklyMissionEntry {
  if (!val || typeof val !== 'object') return false
  const v = val as Record<string, unknown>
  return typeof v.type === 'string' && typeof v.target === 'number' && typeof v.progress === 'number'
}

export async function getWeeklyMissions(characterId: string): Promise<WeeklyMissionsRecord> {
  const supabase = await createClient()
  const weekStart = getWeekStart()

  const { data: existing } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> } } } } })
    .from('weekly_missions').select('*').eq('character_id', characterId).eq('week_start', weekStart).maybeSingle()

  if (existing) {
    const missions = existing.missions as unknown
    if (Array.isArray(missions) && missions.length > 0 && isWeeklyMissionEntry(missions[0])) {
      return mapRecord(existing)
    }
  }

  // Create new weekly missions
  const selected = shuffle([...WEEKLY_MISSION_POOL]).slice(0, 5)
  const missions: WeeklyMissionEntry[] = selected.map((m) => ({
    ...m, progress: 0, completed: false, reward_claimed: false,
  }))

  const { data: created } = await (supabase as unknown as { from: (t: string) => { insert: (d: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .from('weekly_missions').insert({
      character_id: characterId,
      week_start: weekStart,
      missions: missions as unknown,
      completed_count: 0,
      ticket_granted: false,
      early_bonus_claimed: false,
    }).select().single()

  if (created) return mapRecord(created)

  // Fallback
  return { id: '', characterId, weekStart, missions, completedCount: 0, ticketGranted: false, earlyBonusClaimed: false }
}

export async function updateWeeklyProgress(
  characterId: string,
  missionType: WeeklyMissionType,
  increment = 1
): Promise<void> {
  try {
    const supabase = await createClient()
    const weekStart = getWeekStart()

    const { data: record } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> } } } } })
      .from('weekly_missions').select('id, missions, completed_count').eq('character_id', characterId).eq('week_start', weekStart).maybeSingle()

    if (!record) return // No weekly missions yet — will be created on next page load

    const missions = record.missions as unknown as WeeklyMissionEntry[]
    if (!Array.isArray(missions)) return

    let changed = false
    let completedCount = record.completed_count as number

    for (const m of missions) {
      if (m.type === missionType && !m.completed) {
        m.progress = Math.min(m.progress + increment, m.target)
        if (m.progress >= m.target) {
          m.completed = true
          completedCount++
        }
        changed = true
      }
    }

    if (changed) {
      await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } })
        .from('weekly_missions').update({
          missions: missions as unknown,
          completed_count: completedCount,
        }).eq('id', record.id as string)
    }
  } catch {
    // Never throw — weekly progress is non-critical
  }
}

export async function claimWeeklyReward(
  characterId: string,
  userId: string,
  missionIndex: number
): Promise<{
  success: boolean; error?: string
  rewards?: { xp: number; essencias: number; libras: number; ticketGranted: boolean; earlyBonus: boolean }
}> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const weekStart = getWeekStart()
  const { data: record } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } } })
    .from('weekly_missions').select('*').eq('character_id', characterId).eq('week_start', weekStart).single()

  if (!record) return { success: false, error: 'Missões semanais não encontradas.' }

  const missions = record.missions as unknown as WeeklyMissionEntry[]
  if (missionIndex < 0 || missionIndex >= missions.length) return { success: false, error: 'Índice inválido.' }

  const mission = missions[missionIndex]
  if (!mission.completed) return { success: false, error: 'Missão não completada.' }
  if (mission.reward_claimed) return { success: false, error: 'Recompensa já resgatada.' }

  // Grant individual reward
  await grantXp(characterId, mission.xp_reward, supabase)

  const { data: wallet } = await supabase
    .from('character_wallet').select('libras, essencia, summon_tickets').eq('character_id', characterId).single()

  if (wallet) {
    await supabase.from('character_wallet').update({
      libras: wallet.libras + mission.libras_reward,
      essencia: wallet.essencia + mission.essencias_reward,
    } as never).eq('character_id', characterId)
  }

  mission.reward_claimed = true

  // Check 5/5 completion
  let ticketGranted = false
  let earlyBonus = false
  const allClaimed = missions.every((m) => m.reward_claimed)

  if (allClaimed && !(record.ticket_granted as boolean)) {
    ticketGranted = true
    if (wallet) {
      await supabase.from('character_wallet').update({
        summon_tickets: wallet.summon_tickets + 1,
      } as never).eq('character_id', characterId)
    }
    await createNotification({
      characterId, type: 'general',
      title: '5/5 Missões Semanais!',
      body: '+1 Ticket de Summon pela semana completa.',
      actionUrl: '/home',
    })
  }

  if (allClaimed && !(record.early_bonus_claimed as boolean) && isBeforeThursday(weekStart)) {
    earlyBonus = true
    const { data: w2 } = await supabase
      .from('character_wallet').select('essencia').eq('character_id', characterId).single()
    if (w2) {
      await supabase.from('character_wallet').update({
        essencia: w2.essencia + 20,
      } as never).eq('character_id', characterId)
    }
    await createNotification({
      characterId, type: 'general',
      title: 'Bônus antecipado!',
      body: '+20 Essências por completar todas antes de quinta-feira.',
      actionUrl: '/home',
    })
  }

  await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } } })
    .from('weekly_missions').update({
      missions: missions as unknown,
      ticket_granted: ticketGranted || (record.ticket_granted as boolean),
      early_bonus_claimed: earlyBonus || (record.early_bonus_claimed as boolean),
    }).eq('character_id', characterId).eq('week_start', weekStart)

  return {
    success: true,
    rewards: {
      xp: mission.xp_reward,
      essencias: mission.essencias_reward,
      libras: mission.libras_reward,
      ticketGranted,
      earlyBonus,
    },
  }
}

function mapRecord(r: Record<string, unknown>): WeeklyMissionsRecord {
  return {
    id: r.id as string,
    characterId: r.character_id as string,
    weekStart: r.week_start as string,
    missions: r.missions as unknown as WeeklyMissionEntry[],
    completedCount: r.completed_count as number,
    ticketGranted: r.ticket_granted as boolean,
    earlyBonusClaimed: r.early_bonus_claimed as boolean,
  }
}

// ---------------------------------------------------------------------------
// Missões Coletivas de Sociedade — Fase 35
// Referência: GDD_Sociedades §10, GDD_Sistemas §6.16
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { getWeekStart, isBeforeThursday } from '@/lib/utils/formulas'
import { createNotification } from './notifications'
import { grantXp } from './levelup'

export type SocietyMissionType =
  | 'collective_expeditions' | 'collective_pvp_wins' | 'collective_hunting_kills'
  | 'collective_dungeons' | 'collective_troop_recruit' | 'collective_treasury'

export type SocietyMissionDifficulty = 'facil' | 'medio' | 'dificil'

export interface SocietyMissionEntry {
  index: number; type: SocietyMissionType; label: string; description: string
  target: number; progress: number; difficulty: SocietyMissionDifficulty
  completed: boolean; reward_claimed: boolean; treasury_reward: number
  xp_reward: number; is_bonus: boolean; notified_50: boolean
  notified_complete: boolean; contributor_ids: string[]
}

export interface SocietyMissionsRecord {
  id: string; societyId: string; weekStart: string
  missions: SocietyMissionEntry[]; bonusUnlocked: boolean
}

// ─── Pools ────────────────────────────────────────────────────────────────

const SOCIETY_MISSION_POOL: Array<{
  type: SocietyMissionType; label: string; description: string
  target: number; difficulty: SocietyMissionDifficulty
  treasury_reward: number; xp_reward: number
}> = [
  { type: 'collective_expeditions', label: 'Força Expedicionária', description: 'Membros completam 30 expedições.', target: 30, difficulty: 'medio', treasury_reward: 2000, xp_reward: 150 },
  { type: 'collective_pvp_wins', label: 'Sangue pela Guilda', description: 'Membros vencem 20 duelos ranqueados.', target: 20, difficulty: 'medio', treasury_reward: 2500, xp_reward: 200 },
  { type: 'collective_hunting_kills', label: 'A Grande Caçada', description: 'Membros acumulam 500 kills em hunting.', target: 500, difficulty: 'dificil', treasury_reward: 3000, xp_reward: 250 },
  { type: 'collective_dungeons', label: 'Mergulho nas Profundezas', description: 'Membros completam 15 dungeons.', target: 15, difficulty: 'dificil', treasury_reward: 3500, xp_reward: 300 },
  { type: 'collective_troop_recruit', label: 'Fortalecimento das Fileiras', description: 'Sociedade recruta 5 lotes de tropas.', target: 5, difficulty: 'facil', treasury_reward: 1500, xp_reward: 100 },
  { type: 'collective_treasury', label: 'Investimento da Guilda', description: 'Cofre da Sociedade recebe 3.000 Libras.', target: 3000, difficulty: 'medio', treasury_reward: 1000, xp_reward: 80 },
  { type: 'collective_expeditions', label: 'Caravana Imparável', description: 'Membros completam 50 expedições.', target: 50, difficulty: 'dificil', treasury_reward: 4000, xp_reward: 300 },
  { type: 'collective_pvp_wins', label: 'Domínio no Campo', description: 'Membros vencem 10 duelos ranqueados.', target: 10, difficulty: 'facil', treasury_reward: 1200, xp_reward: 100 },
  { type: 'collective_hunting_kills', label: 'Batida de Caça', description: 'Membros acumulam 200 kills em hunting.', target: 200, difficulty: 'facil', treasury_reward: 1500, xp_reward: 120 },
  { type: 'collective_dungeons', label: 'Guardiões do Abismo', description: 'Membros completam 8 dungeons.', target: 8, difficulty: 'medio', treasury_reward: 2000, xp_reward: 180 },
]

const BONUS_TEMPLATES: Record<SocietyMissionType, { label: string; description: string; target: number; treasury_reward: number; xp_reward: number }> = {
  collective_expeditions: { label: 'Expedição Lendária', description: 'Membros completam 80 expedições.', target: 80, treasury_reward: 8000, xp_reward: 500 },
  collective_pvp_wins: { label: 'Supremacia Marcial', description: 'Membros vencem 35 duelos ranqueados.', target: 35, treasury_reward: 8000, xp_reward: 500 },
  collective_hunting_kills: { label: 'Extinção', description: 'Membros acumulam 1.000 kills.', target: 1000, treasury_reward: 9000, xp_reward: 600 },
  collective_dungeons: { label: 'Mestres das Profundezas', description: 'Membros completam 25 dungeons.', target: 25, treasury_reward: 10000, xp_reward: 700 },
  collective_troop_recruit: { label: 'Exército da Guilda', description: 'Sociedade recruta 12 lotes.', target: 12, treasury_reward: 7000, xp_reward: 450 },
  collective_treasury: { label: 'Tesouro da Era', description: 'Cofre recebe 8.000 Libras.', target: 8000, treasury_reward: 3000, xp_reward: 400 },
}

type SBU = { from: (t: string) => Record<string, unknown> }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isSocietyMissionEntry(val: unknown): val is SocietyMissionEntry {
  if (!val || typeof val !== 'object') return false
  const v = val as Record<string, unknown>
  return typeof v.type === 'string' && typeof v.target === 'number' && typeof v.progress === 'number'
}

function drawMissions(): SocietyMissionEntry[] {
  const selected = shuffle([...SOCIETY_MISSION_POOL]).slice(0, 3)
  return selected.map((m, i) => ({
    index: i, type: m.type, label: m.label, description: m.description,
    target: m.target, progress: 0, difficulty: m.difficulty,
    completed: false, reward_claimed: false, treasury_reward: m.treasury_reward,
    xp_reward: m.xp_reward, is_bonus: false, notified_50: false,
    notified_complete: false, contributor_ids: [],
  }))
}

// ─── Main functions ───────────────────────────────────────────────────────

export async function getOrCreateSocietyMissions(societyId: string): Promise<SocietyMissionsRecord | null> {
  const supabase = await createClient()
  const weekStart = getWeekStart()

  const { data: existing } = await (supabase as unknown as SBU).from('society_missions')
    .select('*').eq('society_id', societyId).eq('week_start', weekStart).maybeSingle() as { data: Record<string, unknown> | null }

  if (existing) {
    const missions = existing.missions as unknown
    if (Array.isArray(missions) && missions.length > 0 && isSocietyMissionEntry(missions[0])) {
      return mapRecord(existing)
    }
  }

  const missions = drawMissions()
  const { data: created } = await (supabase as unknown as SBU).from('society_missions')
    .insert({ society_id: societyId, week_start: weekStart, missions: missions as unknown, bonus_unlocked: false })
    .select().single() as { data: Record<string, unknown> | null }

  return created ? mapRecord(created) : null
}

export async function updateSocietyMissionProgress(
  characterId: string, missionType: SocietyMissionType, increment = 1
): Promise<void> {
  try {
    const supabase = await createClient()

    // Get character's society
    const { data: character } = await supabase
      .from('characters').select('id, society_id').eq('id', characterId).single()
    if (!character?.society_id) return

    const societyId = character.society_id
    const record = await getOrCreateSocietyMissions(societyId)
    if (!record) return

    const missions = record.missions
    let changed = false

    // Get society members for notifications
    const { data: members } = await supabase
      .from('society_members').select('character_id').eq('society_id', societyId)
    const memberIds = (members ?? []).map((m) => m.character_id)

    for (const m of missions) {
      if (m.completed) continue
      if (m.is_bonus && !record.bonusUnlocked) continue

      // Map collective type to check
      const typeMatches =
        (missionType === 'collective_expeditions' && m.type === 'collective_expeditions') ||
        (missionType === 'collective_pvp_wins' && m.type === 'collective_pvp_wins') ||
        (missionType === 'collective_hunting_kills' && m.type === 'collective_hunting_kills') ||
        (missionType === 'collective_dungeons' && m.type === 'collective_dungeons') ||
        (missionType === 'collective_troop_recruit' && m.type === 'collective_troop_recruit') ||
        (missionType === 'collective_treasury' && m.type === 'collective_treasury')

      if (!typeMatches) continue

      m.progress = Math.min(m.progress + increment, m.target)
      if (!m.contributor_ids.includes(characterId)) {
        m.contributor_ids = Array.from(new Set([...m.contributor_ids, characterId]))
      }
      changed = true

      // 50% notification
      if (m.progress >= Math.ceil(m.target * 0.5) && !m.notified_50) {
        m.notified_50 = true
        for (const mid of memberIds) {
          await createNotification({
            characterId: mid, type: 'general',
            title: `Missão 50%: ${m.label}`,
            body: `${m.progress}/${m.target} — metade do caminho!`,
            actionUrl: '/society',
          }).catch(() => {})
        }
      }

      // Complete
      if (m.progress >= m.target) {
        m.completed = true
        m.notified_complete = true
        m.reward_claimed = true

        // Treasury reward
        const { data: society } = await supabase
          .from('societies').select('treasury_libras').eq('id', societyId).single()
        if (society) {
          await supabase.from('societies')
            .update({ treasury_libras: (society.treasury_libras ?? 0) + m.treasury_reward } as never)
            .eq('id', societyId)
        }

        // XP for contributors
        for (const cid of m.contributor_ids) {
          await grantXp(cid, m.xp_reward).catch(() => {})
        }

        // Notify
        for (const mid of memberIds) {
          await createNotification({
            characterId: mid, type: 'general',
            title: `Missão concluída: ${m.label}`,
            body: `+${m.treasury_reward} Libras no cofre. Contribuidores: +${m.xp_reward} XP.`,
            actionUrl: '/society',
          }).catch(() => {})
        }
      }
    }

    // Check bonus unlock
    const baseMissions = missions.filter((m) => !m.is_bonus)
    const allBaseComplete = baseMissions.length >= 3 && baseMissions.every((m) => m.completed)

    if (allBaseComplete && !record.bonusUnlocked && isBeforeThursday(record.weekStart)) {
      const usedTypes = new Set(baseMissions.map((m) => m.type))
      const allTypes: SocietyMissionType[] = ['collective_expeditions', 'collective_pvp_wins', 'collective_hunting_kills', 'collective_dungeons', 'collective_troop_recruit', 'collective_treasury']
      const availableTypes = allTypes.filter((t) => !usedTypes.has(t))
      const bonusType = availableTypes.length > 0
        ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
        : allTypes[Math.floor(Math.random() * allTypes.length)]

      const template = BONUS_TEMPLATES[bonusType]
      missions.push({
        index: 3, type: bonusType, label: template.label, description: template.description,
        target: template.target, progress: 0, difficulty: 'dificil',
        completed: false, reward_claimed: false, treasury_reward: template.treasury_reward,
        xp_reward: template.xp_reward, is_bonus: true, notified_50: false,
        notified_complete: false, contributor_ids: [],
      })

      for (const mid of memberIds) {
        await createNotification({
          characterId: mid, type: 'general',
          title: 'Missão Bônus desbloqueada!',
          body: `${template.label}: ${template.description}`,
          actionUrl: '/society',
        }).catch(() => {})
      }

      changed = true
      record.bonusUnlocked = true
    }

    if (changed) {
      await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } })
        .from('society_missions').update({
          missions: missions as unknown,
          bonus_unlocked: record.bonusUnlocked,
        }).eq('id', record.id)
    }
  } catch {
    // Never throw
  }
}

export async function getSocietyMissionHistory(societyId: string, weeks = 4) {
  const supabase = await createClient()

  const { data: records } = await (supabase as unknown as SBU).from('society_missions')
    .select('*').eq('society_id', societyId).order('week_start', { ascending: false }).limit(weeks) as { data: Array<Record<string, unknown>> | null }

  const mapped = (records ?? []).map(mapRecord)

  // Calculate stats
  let streak = 0
  let bestWeek = 0
  let totalCompleted = 0

  for (const r of mapped) {
    const baseCompleted = r.missions.filter((m) => !m.is_bonus && m.completed).length
    totalCompleted += r.missions.filter((m) => m.completed).length
    if (baseCompleted > bestWeek) bestWeek = baseCompleted
    if (baseCompleted >= 3) streak++
    else break // streak breaks
  }

  return { records: mapped, streak, bestWeek, totalCompleted }
}

export async function getMissionContributors(
  societyId: string, missionType: SocietyMissionType, weekStart: string
): Promise<Array<{ characterId: string; characterName: string; count: number }>> {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('society_members').select('character_id, characters(name)')
    .eq('society_id', societyId)

  if (!members || members.length === 0) return []

  const memberMap = new Map<string, string>()
  for (const m of members) {
    const name = ((m.characters as Record<string, unknown>)?.name as string) ?? '?'
    memberMap.set(m.character_id, name)
  }
  const memberIds = Array.from(memberMap.keys())

  const results: Array<{ characterId: string; characterName: string; count: number }> = []

  if (missionType === 'collective_hunting_kills') {
    // Count via hunting_sessions
    for (const charId of memberIds) {
      const { data: sessions } = await (supabase as unknown as SBU).from('hunting_sessions')
        .select('kills').eq('character_id', charId).in('status', ['finished', 'died'])
        .gte('finished_at', weekStart + 'T00:00:00Z') as { data: Array<Record<string, unknown>> | null }
      const total = (sessions ?? []).reduce((s, sess) => s + ((sess.kills as number) ?? 0), 0)
      if (total > 0) results.push({ characterId: charId, characterName: memberMap.get(charId) ?? '?', count: total })
    }
  } else {
    // Count via events table
    const eventTypeMap: Record<string, string> = {
      collective_expeditions: 'expedition_completed',
      collective_pvp_wins: 'combat_finished',
      collective_dungeons: 'dungeon_finished',
      collective_troop_recruit: 'expedition_started',
      collective_treasury: 'currency_granted',
    }
    const eventType = eventTypeMap[missionType]
    if (eventType) {
      for (const charId of memberIds) {
        const { count } = await supabase
          .from('events').select('id', { count: 'exact', head: true })
          .eq('type', eventType).eq('actor_id', charId)
          .gte('created_at', weekStart + 'T00:00:00Z')
        if ((count ?? 0) > 0) results.push({ characterId: charId, characterName: memberMap.get(charId) ?? '?', count: count ?? 0 })
      }
    }
  }

  results.sort((a, b) => b.count - a.count)
  return results.slice(0, 3)
}

export async function rollWeeklyMissions(): Promise<{ success: boolean; error?: string; created: number }> {
  const supabase = await createClient()
  const weekStart = getWeekStart()

  const { data: societies } = await supabase
    .from('societies').select('id').is('dissolved_at', null)
  if (!societies) return { success: true, created: 0 }

  let created = 0
  for (const s of societies) {
    const { data: existing } = await (supabase as unknown as SBU).from('society_missions')
      .select('id').eq('society_id', s.id).eq('week_start', weekStart).maybeSingle() as { data: Record<string, unknown> | null }
    if (existing) continue

    const missions = drawMissions()
    await (supabase as unknown as SBU).from('society_missions')
      .insert({ society_id: s.id, week_start: weekStart, missions: missions as unknown, bonus_unlocked: false }) as unknown
    created++
  }

  return { success: true, created }
}

function mapRecord(r: Record<string, unknown>): SocietyMissionsRecord {
  return {
    id: r.id as string, societyId: r.society_id as string,
    weekStart: r.week_start as string,
    missions: (r.missions as unknown as SocietyMissionEntry[]) ?? [],
    bonusUnlocked: (r.bonus_unlocked as boolean) ?? false,
  }
}

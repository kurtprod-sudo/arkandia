// ---------------------------------------------------------------------------
// Sistema de Conquistas — Fase 28
// Referência: GDD_Sistemas §6.9
// ---------------------------------------------------------------------------

import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'

export type AchievementEventType =
  | 'level_up' | 'pvp_win' | 'ambush_performed' | 'tournament_won'
  | 'daily_challenge_streak' | 'hunting_kill' | 'expedition_complete'
  | 'troop_expedition_complete' | 'dungeon_complete' | 'bazaar_trade'
  | 'craft_item' | 'letter_sent' | 'diary_written' | 'daily_tasks_complete'
  | 'daily_tasks_streak' | 'login_streak' | 'maestria_learned'
  | 'all_maestrias_learned' | 'equipment_enhanced' | 'item_equipped'
  | 'summon_performed' | 'summon_lendario' | 'society_joined' | 'war_won'
  | 'resonance_unlocked' | 'world_event_participated' | 'libras_milestone'
  | 'lore_found' | 'first_login'

export interface AchievementCheckMeta {
  newLevel?: number
  streakDays?: number
  killCount?: number
  librasTotal?: number
  enhancementLevel?: number
  modality?: string
  [key: string]: unknown
}

export interface AchievementWithProgress {
  id: string
  key: string
  title: string
  description: string
  category: string
  rarity: 'comum' | 'raro' | 'epico' | 'lendario'
  icon: string
  target: number | null
  titleRewardName: string | null
  progress: number
  unlockedAt: string | null
}

type Rarity = 'comum' | 'raro' | 'epico' | 'lendario'
type SB = SupabaseClient<Database>

// ─── Internal helpers ─────────────────────────────────────────────────────

async function getAchievement(key: string, sb: SB) {
  const { data } = await (sb as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .from('achievements').select('id, rarity, icon, title, title_reward_name, target').eq('key', key).single()
  return data
}

async function getOrCreateProgress(characterId: string, achievementId: string, sb: SB) {
  const tbl = sb as unknown as { from: (t: string) => Record<string, unknown> }
  const { data: existing } = await (tbl.from('character_achievements') as unknown as { select: (s: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .select('id, progress, unlocked_at').eq('character_id', characterId).eq('achievement_id', achievementId).maybeSingle()

  if (existing) return existing

  await (tbl.from('character_achievements') as unknown as { insert: (d: Record<string, unknown>) => Promise<unknown> })
    .insert({ character_id: characterId, achievement_id: achievementId, progress: 0 })

  const { data: created } = await (tbl.from('character_achievements') as unknown as { select: (s: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .select('id, progress, unlocked_at').eq('character_id', characterId).eq('achievement_id', achievementId).single()

  return created
}

async function tryUnlock(characterId: string, key: string, sb: SB): Promise<void> {
  const achievement = await getAchievement(key, sb)
  if (!achievement) return

  const record = await getOrCreateProgress(characterId, achievement.id as string, sb)
  if (!record || record.unlocked_at) return

  const tbl = sb as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } }
  await tbl.from('character_achievements')
    .update({ unlocked_at: new Date().toISOString(), progress: (achievement.target as number) ?? 1 })
    .eq('id', record.id as string)

  await grantRarityReward(characterId, achievement.rarity as Rarity, sb)
  if (achievement.title_reward_name) {
    await grantAchievementTitle(characterId, achievement.title_reward_name as string, sb)
  }
  await notifyUnlock(characterId, achievement.title as string, achievement.rarity as Rarity, achievement.icon as string)
}

async function tryIncrement(characterId: string, key: string, sb: SB): Promise<void> {
  const achievement = await getAchievement(key, sb)
  if (!achievement || !achievement.target) return

  const record = await getOrCreateProgress(characterId, achievement.id as string, sb)
  if (!record || record.unlocked_at) return

  const newProgress = (record.progress as number) + 1
  const target = achievement.target as number

  const tbl = sb as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } }

  if (newProgress >= target) {
    await tbl.from('character_achievements')
      .update({ progress: newProgress, unlocked_at: new Date().toISOString() })
      .eq('id', record.id as string)
    await grantRarityReward(characterId, achievement.rarity as Rarity, sb)
    if (achievement.title_reward_name) {
      await grantAchievementTitle(characterId, achievement.title_reward_name as string, sb)
    }
    await notifyUnlock(characterId, achievement.title as string, achievement.rarity as Rarity, achievement.icon as string)
  } else {
    await tbl.from('character_achievements')
      .update({ progress: newProgress })
      .eq('id', record.id as string)
  }
}

async function grantRarityReward(characterId: string, rarity: Rarity, sb: SB): Promise<void> {
  if (rarity === 'comum') return
  const { data: wallet } = await sb.from('character_wallet').select('essencia, summon_tickets').eq('character_id', characterId).single()
  if (!wallet) return

  if (rarity === 'raro') {
    await sb.from('character_wallet').update({ essencia: wallet.essencia + 5 } as never).eq('character_id', characterId)
  } else if (rarity === 'epico') {
    await sb.from('character_wallet').update({ essencia: wallet.essencia + 15 } as never).eq('character_id', characterId)
  } else if (rarity === 'lendario') {
    await sb.from('character_wallet').update({ summon_tickets: wallet.summon_tickets + 1 } as never).eq('character_id', characterId)
  }
}

async function grantAchievementTitle(characterId: string, titleName: string, sb: SB): Promise<void> {
  const { data: titleDef } = await sb.from('title_definitions').select('id').eq('name', titleName).maybeSingle()
  if (!titleDef) return
  const { grantTitle } = await import('./titles')
  await grantTitle(characterId, titleDef.id, 'system')
}

async function notifyUnlock(characterId: string, achievementTitle: string, rarity: Rarity, icon: string): Promise<void> {
  await createNotification({
    characterId,
    type: 'general',
    title: `Conquista: ${achievementTitle}`,
    body: `Você desbloqueou uma conquista ${rarity}!`,
    actionUrl: '/achievements',
    metadata: { achievement: true, rarity, icon, achievementTitle },
  })
}

// ─── Main check function ──────────────────────────────────────────────────

export async function checkAchievements(
  characterId: string,
  eventType: AchievementEventType,
  meta: AchievementCheckMeta,
  supabaseOverride?: SupabaseClient<Database>
): Promise<void> {
  try {
    const sb = supabaseOverride ?? await createClient()

    if (eventType === 'first_login') await tryUnlock(characterId, 'first_login', sb)

    if (eventType === 'level_up' && meta.newLevel) {
      if (meta.newLevel >= 2) await tryUnlock(characterId, 'first_level', sb)
      if (meta.newLevel >= 5) await tryUnlock(characterId, 'level_5', sb)
      if (meta.newLevel >= 10) await tryUnlock(characterId, 'level_10', sb)
      if (meta.newLevel >= 20) await tryUnlock(characterId, 'level_20', sb)
      if (meta.newLevel >= 30) await tryUnlock(characterId, 'level_30', sb)
    }

    if (eventType === 'pvp_win') {
      await tryUnlock(characterId, 'first_pvp_win', sb)
      await tryIncrement(characterId, 'pvp_wins_10', sb)
      await tryIncrement(characterId, 'pvp_wins_50', sb)
      await tryIncrement(characterId, 'pvp_wins_100', sb)
      await tryIncrement(characterId, 'pvp_wins_500', sb)
    }

    if (eventType === 'ambush_performed') await tryUnlock(characterId, 'first_ambush', sb)
    if (eventType === 'tournament_won') await tryUnlock(characterId, 'tournament_win', sb)

    if (eventType === 'daily_challenge_streak') {
      await tryIncrement(characterId, 'daily_challenge_7', sb)
      await tryIncrement(characterId, 'daily_challenge_30', sb)
    }

    if (eventType === 'hunting_kill') {
      await tryUnlock(characterId, 'first_hunting', sb)
      await tryIncrement(characterId, 'hunting_kills_100', sb)
      await tryIncrement(characterId, 'hunting_kills_500', sb)
      await tryIncrement(characterId, 'hunting_kills_1000', sb)
    }

    if (eventType === 'expedition_complete') {
      await tryUnlock(characterId, 'first_expedition', sb)
      await tryIncrement(characterId, 'expeditions_10', sb)
      await tryIncrement(characterId, 'expeditions_50', sb)
    }

    if (eventType === 'troop_expedition_complete') await tryUnlock(characterId, 'first_troop_exp', sb)

    if (eventType === 'dungeon_complete') {
      await tryUnlock(characterId, 'first_dungeon', sb)
      await tryIncrement(characterId, 'dungeons_10', sb)
      await tryIncrement(characterId, 'dungeons_50', sb)
    }

    if (eventType === 'letter_sent') {
      await tryUnlock(characterId, 'first_letter', sb)
      await tryIncrement(characterId, 'letters_10', sb)
      await tryIncrement(characterId, 'letters_50', sb)
    }

    if (eventType === 'diary_written') await tryUnlock(characterId, 'first_diary', sb)
    if (eventType === 'society_joined') await tryUnlock(characterId, 'join_society', sb)
    if (eventType === 'war_won') await tryUnlock(characterId, 'society_war_win', sb)
    if (eventType === 'resonance_unlocked') await tryUnlock(characterId, 'resonance_event', sb)

    if (eventType === 'bazaar_trade') {
      await tryUnlock(characterId, 'first_trade', sb)
      await tryIncrement(characterId, 'trades_50', sb)
    }

    if (eventType === 'craft_item') await tryUnlock(characterId, 'first_craft', sb)

    if (eventType === 'libras_milestone' && meta.librasTotal) {
      if (meta.librasTotal >= 100000) await tryUnlock(characterId, 'libras_100k', sb)
    }

    if (eventType === 'summon_performed') await tryUnlock(characterId, 'first_summon', sb)
    if (eventType === 'summon_lendario') await tryUnlock(characterId, 'summon_lendario', sb)
    if (eventType === 'maestria_learned') await tryUnlock(characterId, 'first_maestria', sb)
    if (eventType === 'all_maestrias_learned') await tryUnlock(characterId, 'all_maestrias', sb)
    if (eventType === 'item_equipped') await tryUnlock(characterId, 'first_equipment', sb)

    if (eventType === 'equipment_enhanced' && meta.enhancementLevel) {
      if (meta.enhancementLevel >= 5) await tryUnlock(characterId, 'enhance_plus5', sb)
      if (meta.enhancementLevel >= 12) await tryUnlock(characterId, 'enhance_plus12', sb)
    }

    if (eventType === 'login_streak' && meta.streakDays) {
      if (meta.streakDays >= 30) await tryUnlock(characterId, 'streak_30', sb)
    }

    if (eventType === 'daily_tasks_complete') await tryUnlock(characterId, 'all_daily_tasks', sb)
    if (eventType === 'daily_tasks_streak') await tryIncrement(characterId, 'daily_tasks_30', sb)
    if (eventType === 'world_event_participated') await tryUnlock(characterId, 'first_world_event', sb)
    if (eventType === 'lore_found') await tryUnlock(characterId, 'secret_lore', sb)
  } catch {
    // Never throw — achievements are non-critical
  }
}

// ─── Query ────────────────────────────────────────────────────────────────

export async function getCharacterAchievements(characterId: string): Promise<AchievementWithProgress[]> {
  const supabase = await createClient()

  // Get all achievements
  const { data: allAchievements } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (k: string) => Promise<{ data: Array<Record<string, unknown>> | null }> } } })
    .from('achievements').select('*').order('category')

  // Get character progress
  const { data: progress } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => Promise<{ data: Array<Record<string, unknown>> | null }> } } })
    .from('character_achievements').select('achievement_id, progress, unlocked_at').eq('character_id', characterId)

  const progressMap = new Map<string, { progress: number; unlockedAt: string | null }>()
  for (const p of progress ?? []) {
    progressMap.set(p.achievement_id as string, {
      progress: p.progress as number,
      unlockedAt: p.unlocked_at as string | null,
    })
  }

  const results: AchievementWithProgress[] = (allAchievements ?? []).map((a) => {
    const p = progressMap.get(a.id as string)
    return {
      id: a.id as string,
      key: a.key as string,
      title: a.title as string,
      description: a.description as string,
      category: a.category as string,
      rarity: a.rarity as Rarity,
      icon: a.icon as string,
      target: a.target as number | null,
      titleRewardName: a.title_reward_name as string | null,
      progress: p?.progress ?? 0,
      unlockedAt: p?.unlockedAt ?? null,
    }
  })

  // Sort: unlocked first (newest), then by rarity desc, then progress desc
  const rarityOrder: Record<string, number> = { lendario: 4, epico: 3, raro: 2, comum: 1 }
  results.sort((a, b) => {
    if (a.unlockedAt && !b.unlockedAt) return -1
    if (!a.unlockedAt && b.unlockedAt) return 1
    if (a.unlockedAt && b.unlockedAt) return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    const rDiff = (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0)
    if (rDiff !== 0) return rDiff
    return b.progress - a.progress
  })

  return results
}

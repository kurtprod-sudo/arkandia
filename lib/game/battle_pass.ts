// ---------------------------------------------------------------------------
// Battle Pass — Fase 32
// Referência: GDD_Sistemas §6.13
// ---------------------------------------------------------------------------

import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/server'

export interface TierReward {
  libras: number; essencias: number; gemas: number; tickets: number
}

export interface CharacterBattlePass {
  id: string; characterId: string; seasonId: string
  seasonXp: number; currentTier: number; isPremium: boolean
  purchasedAt: string | null
}

export interface BattlePassStatus extends CharacterBattlePass {
  seasonName: string; seasonTheme: string; seasonEndsAt: string
  xpToNextTier: number
  claimedTiers: Array<{ tier: number; track: 'free' | 'premium' }>
}

export function getFreeReward(tier: number): TierReward {
  if (tier === 40) return { libras: 1000, essencias: 100, gemas: 0, tickets: 0 }
  if (tier === 10 || tier === 20 || tier === 30) return { libras: 500, essencias: 50, gemas: 0, tickets: 0 }
  if (tier % 2 === 1) return { libras: 150, essencias: 0, gemas: 0, tickets: 0 }
  return { libras: 0, essencias: 20, gemas: 0, tickets: 0 }
}

export function getPremiumReward(tier: number): TierReward {
  if (tier === 40) return { libras: 0, essencias: 200, gemas: 100, tickets: 2 }
  if (tier === 10 || tier === 20 || tier === 30) return { libras: 0, essencias: 100, gemas: 0, tickets: 1 }
  if (tier === 5 || tier === 15 || tier === 25 || tier === 35) return { libras: 0, essencias: 0, gemas: 50, tickets: 0 }
  return { libras: 0, essencias: 0, gemas: 0, tickets: 0 }
}

type SB = SupabaseClient<Database>
type SBANY = { from: (t: string) => Record<string, unknown> }

export async function getOrCreateBattlePass(characterId: string): Promise<CharacterBattlePass | null> {
  const supabase = await createClient()

  const { data: season } = await supabase.from('seasons').select('id').eq('is_active', true).maybeSingle()
  if (!season) return null

  const { data: existing } = await (supabase as unknown as SBANY).from('character_battle_pass')
    .select('*').eq('character_id', characterId).eq('season_id', season.id).maybeSingle() as { data: Record<string, unknown> | null }
  if (existing) return mapBP(existing)

  await (supabase as unknown as SBANY).from('character_battle_pass')
    .insert({ character_id: characterId, season_id: season.id, season_xp: 0, current_tier: 0, is_premium: false }) as unknown

  const { data: created } = await (supabase as unknown as SBANY).from('character_battle_pass')
    .select('*').eq('character_id', characterId).eq('season_id', season.id).single() as { data: Record<string, unknown> | null }

  return created ? mapBP(created) : null
}

export async function addSeasonXp(
  characterId: string, xpAmount: number, supabaseOverride?: SB
): Promise<void> {
  try {
    const seasonXpGain = Math.floor(xpAmount / 10)
    if (seasonXpGain <= 0) return

    const sb = supabaseOverride ?? await createClient()
    const { data: season } = await sb.from('seasons').select('id').eq('is_active', true).maybeSingle()
    if (!season) return

    const { data: bp } = await (sb as unknown as SBANY).from('character_battle_pass')
      .select('id, season_xp, current_tier')
      .eq('character_id', characterId).eq('season_id', season.id).maybeSingle() as { data: Record<string, unknown> | null }

    if (!bp) {
      // Create battle pass entry
      await (sb as unknown as SBANY).from('character_battle_pass')
        .insert({ character_id: characterId, season_id: season.id, season_xp: seasonXpGain, current_tier: Math.min(40, Math.floor(seasonXpGain / 100)) }) as unknown
      return
    }

    const newXp = (bp.season_xp as number) + seasonXpGain
    const newTier = Math.min(40, Math.floor(newXp / 100))

    await (sb as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } })
      .from('character_battle_pass')
      .update({ season_xp: newXp, current_tier: newTier })
      .eq('id', bp.id as string)
  } catch {
    // Never throw
  }
}

export async function claimTierReward(
  characterId: string, userId: string, tier: number, track: 'free' | 'premium'
): Promise<{ success: boolean; error?: string; reward?: TierReward }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const bp = await getOrCreateBattlePass(characterId)
  if (!bp) return { success: false, error: 'Nenhuma temporada ativa.' }
  if (bp.currentTier < tier) return { success: false, error: `Tier ${tier} ainda não alcançado.` }
  if (track === 'premium' && !bp.isPremium) return { success: false, error: 'Trilha premium não ativada.' }

  // Check if already claimed
  const { data: claimed } = await (supabase as unknown as SBANY).from('battle_pass_claims')
    .select('id').eq('character_id', characterId).eq('season_id', bp.seasonId)
    .eq('tier', tier).eq('track', track).maybeSingle() as { data: Record<string, unknown> | null }
  if (claimed) return { success: false, error: 'Recompensa já coletada.' }

  const reward = track === 'free' ? getFreeReward(tier) : getPremiumReward(tier)

  // Grant rewards
  const { data: wallet } = await supabase.from('character_wallet')
    .select('libras, essencia, premium_currency, summon_tickets')
    .eq('character_id', characterId).single()
  if (wallet) {
    const updates: Record<string, number> = {}
    if (reward.libras > 0) updates.libras = wallet.libras + reward.libras
    if (reward.essencias > 0) updates.essencia = wallet.essencia + reward.essencias
    if (reward.gemas > 0) updates.premium_currency = (wallet.premium_currency ?? 0) + reward.gemas
    if (reward.tickets > 0) updates.summon_tickets = wallet.summon_tickets + reward.tickets
    if (Object.keys(updates).length > 0) {
      await supabase.from('character_wallet').update(updates as never).eq('character_id', characterId)
    }
  }

  // Record claim
  await (supabase as unknown as SBANY).from('battle_pass_claims')
    .insert({ character_id: characterId, season_id: bp.seasonId, tier, track }) as unknown

  return { success: true, reward }
}

export async function purchasePremium(
  characterId: string, userId: string
): Promise<{ success: boolean; error?: string; tiersDelivered?: number }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const bp = await getOrCreateBattlePass(characterId)
  if (!bp) return { success: false, error: 'Nenhuma temporada ativa.' }
  if (bp.isPremium) return { success: false, error: 'Já é premium.' }

  // Check gemas
  const { data: wallet } = await supabase.from('character_wallet')
    .select('premium_currency').eq('character_id', characterId).single()
  if (!wallet || (wallet.premium_currency ?? 0) < 500) {
    return { success: false, error: 'Gemas insuficientes. Necessário: 500.' }
  }

  // Debit gemas
  await supabase.from('character_wallet')
    .update({ premium_currency: (wallet.premium_currency ?? 0) - 500 } as never)
    .eq('character_id', characterId)

  // Activate premium
  await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } })
    .from('character_battle_pass')
    .update({ is_premium: true, purchased_at: new Date().toISOString() })
    .eq('id', bp.id)

  // Retroactive delivery
  let delivered = 0
  for (let t = 1; t <= bp.currentTier; t++) {
    const reward = getPremiumReward(t)
    if (reward.libras === 0 && reward.essencias === 0 && reward.gemas === 0 && reward.tickets === 0) continue

    const { data: alreadyClaimed } = await (supabase as unknown as SBANY).from('battle_pass_claims')
      .select('id').eq('character_id', characterId).eq('season_id', bp.seasonId)
      .eq('tier', t).eq('track', 'premium').maybeSingle() as { data: Record<string, unknown> | null }
    if (alreadyClaimed) continue

    const { data: w } = await supabase.from('character_wallet')
      .select('libras, essencia, premium_currency, summon_tickets')
      .eq('character_id', characterId).single()
    if (w) {
      const u: Record<string, number> = {}
      if (reward.libras > 0) u.libras = w.libras + reward.libras
      if (reward.essencias > 0) u.essencia = w.essencia + reward.essencias
      if (reward.gemas > 0) u.premium_currency = (w.premium_currency ?? 0) + reward.gemas
      if (reward.tickets > 0) u.summon_tickets = w.summon_tickets + reward.tickets
      if (Object.keys(u).length > 0) await supabase.from('character_wallet').update(u as never).eq('character_id', characterId)
    }

    await (supabase as unknown as SBANY).from('battle_pass_claims')
      .insert({ character_id: characterId, season_id: bp.seasonId, tier: t, track: 'premium' }) as unknown
    delivered++
  }

  return { success: true, tiersDelivered: delivered }
}

export async function getBattlePassStatus(characterId: string): Promise<BattlePassStatus | null> {
  const supabase = await createClient()

  const { data: season } = await supabase.from('seasons').select('id, name, theme, ends_at').eq('is_active', true).maybeSingle()
  if (!season) return null

  const bp = await getOrCreateBattlePass(characterId)
  if (!bp) return null

  const { data: claims } = await (supabase as unknown as SBANY).from('battle_pass_claims')
    .select('tier, track').eq('character_id', characterId).eq('season_id', season.id) as { data: Array<Record<string, unknown>> | null }

  const xpToNext = bp.currentTier >= 40 ? 0 : ((bp.currentTier + 1) * 100) - bp.seasonXp

  return {
    ...bp,
    seasonName: season.name,
    seasonTheme: season.theme ?? '',
    seasonEndsAt: season.ends_at ?? '',
    xpToNextTier: Math.max(0, xpToNext),
    claimedTiers: (claims ?? []).map((c) => ({ tier: c.tier as number, track: c.track as 'free' | 'premium' })),
  }
}

function mapBP(r: Record<string, unknown>): CharacterBattlePass {
  return {
    id: r.id as string, characterId: r.character_id as string,
    seasonId: r.season_id as string, seasonXp: (r.season_xp as number) ?? 0,
    currentTier: (r.current_tier as number) ?? 0, isPremium: (r.is_premium as boolean) ?? false,
    purchasedAt: r.purchased_at as string | null,
  }
}

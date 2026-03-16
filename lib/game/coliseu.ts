// ---------------------------------------------------------------------------
// Coliseu — PvP Assíncrono Ranqueado — Fase 30
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'
import { calcSkillDamage, calcDodgeChance } from './attributes'

export type ColiseuResult = 'win' | 'loss' | 'draw'
export type ColiseuTier = 'Iniciante' | 'Guerreiro' | 'Veterano' | 'Elite' | 'Lendário'

export interface MirrorAttrsSnapshot {
  ataque: number; magia: number; defesa: number; vitalidade: number
  velocidade: number; precisao: number; tenacidade: number
  hp_max: number; eter_max: number
}

export interface MirrorSkillSnapshot {
  slot: number; skill_id: string; skill_name: string
  formula: Record<string, number>; eter_cost: number; skill_type: string
}

export interface CharacterMirror {
  characterId: string; attrsSnapshot: MirrorAttrsSnapshot
  buildingSnapshot: MirrorSkillSnapshot[]; coliseuPoints: number
  wins: number; losses: number; dailyChallengesUsed: number
  lastChallengeDate: string | null; updatedAt: string
}

export interface CombatLogEntry {
  turn: number; actor: 'challenger' | 'defender'
  action: string; damage: number; hpAfter: number
}

// ─── Tier & Points ────────────────────────────────────────────────────────

export function getColiseuTier(points: number): ColiseuTier {
  if (points >= 3500) return 'Lendário'
  if (points >= 2000) return 'Elite'
  if (points >= 1000) return 'Veterano'
  if (points >= 500) return 'Guerreiro'
  return 'Iniciante'
}

export function calcPointsDelta(
  challengerPoints: number, defenderPoints: number, result: ColiseuResult
): number {
  const diff = defenderPoints - challengerPoints
  if (result === 'draw') return 0
  if (result === 'win') {
    if (diff >= 200) return 35
    if (diff <= -200) return 15
    return 25
  }
  // loss
  if (diff >= 200) return -8
  if (diff <= -200) return -22
  return -15
}

export function getChallengeExtraCost(used: number): number {
  if (used < 5) return 0
  const extra = used - 5
  if (extra === 0) return 10
  if (extra === 1) return 20
  if (extra === 2) return 40
  if (extra === 3) return 80
  return 160
}

// ─── Mirror CRUD ──────────────────────────────────────────────────────────

export async function updateMirror(characterId: string): Promise<void> {
  try {
    const supabase = await createClient()

    const { data: attrs } = await supabase
      .from('character_attributes')
      .select('ataque, magia, defesa, vitalidade, velocidade, precisao, tenacidade, hp_max, eter_max')
      .eq('character_id', characterId).single()
    if (!attrs) return

    const { data: buildingRaw } = await supabase
      .from('character_building')
      .select('slot, skill_id, skills(id, name, formula, eter_cost, skill_type)')
      .eq('character_id', characterId).order('slot')

    const buildingSnapshot: MirrorSkillSnapshot[] = (buildingRaw ?? [])
      .filter((b) => b.skills)
      .map((b) => {
        const s = b.skills as Record<string, unknown>
        return {
          slot: b.slot as number,
          skill_id: s.id as string,
          skill_name: s.name as string,
          formula: (s.formula ?? {}) as Record<string, number>,
          eter_cost: (s.eter_cost as number) ?? 0,
          skill_type: (s.skill_type as string) ?? 'ativa',
        }
      })

    const attrsSnapshot: MirrorAttrsSnapshot = {
      ataque: attrs.ataque, magia: attrs.magia, defesa: attrs.defesa,
      vitalidade: attrs.vitalidade, velocidade: attrs.velocidade,
      precisao: attrs.precisao, tenacidade: attrs.tenacidade,
      hp_max: attrs.hp_max, eter_max: attrs.eter_max,
    }

    await (supabase as unknown as { from: (t: string) => { upsert: (d: Record<string, unknown>, o: Record<string, string>) => Promise<unknown> } })
      .from('character_mirrors').upsert({
        character_id: characterId,
        attrs_snapshot: attrsSnapshot as unknown,
        building_snapshot: buildingSnapshot as unknown,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'character_id' })
  } catch {
    // Never throw
  }
}

export async function getOrCreateMirror(characterId: string): Promise<CharacterMirror> {
  const supabase = await createClient()
  const { data } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .from('character_mirrors').select('*').eq('character_id', characterId).single()

  if (data) return mapMirror(data)

  await updateMirror(characterId)
  const { data: created } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .from('character_mirrors').select('*').eq('character_id', characterId).single()

  return created ? mapMirror(created) : {
    characterId, attrsSnapshot: { ataque: 10, magia: 10, defesa: 5, vitalidade: 10, velocidade: 10, precisao: 10, tenacidade: 10, hp_max: 130, eter_max: 50 },
    buildingSnapshot: [], coliseuPoints: 500, wins: 0, losses: 0,
    dailyChallengesUsed: 0, lastChallengeDate: null, updatedAt: new Date().toISOString(),
  }
}

export async function getAvailableOpponents(
  characterId: string
): Promise<Array<CharacterMirror & { characterName: string }>> {
  const supabase = await createClient()
  const mirror = await getOrCreateMirror(characterId)
  const minPts = mirror.coliseuPoints - 200
  const maxPts = mirror.coliseuPoints + 200

  const { data } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { neq: (k: string, v: string) => { gte: (k: string, v: number) => { lte: (k: string, v: number) => { limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }> } } } } } })
    .from('character_mirrors').select('*, characters(name)')
    .neq('character_id', characterId)
    .gte('coliseu_points', minPts).lte('coliseu_points', maxPts).limit(10)

  const all = (data ?? []).map((d) => ({
    ...mapMirror(d),
    characterName: ((d.characters as Record<string, unknown>)?.name as string) ?? '?',
  }))

  // Shuffle and take 5
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]]
  }
  return all.slice(0, 5)
}

// ─── Combat Simulation (pure function — no DB) ───────────────────────────

export function simulateCombat(
  cAttrs: MirrorAttrsSnapshot, cBuilding: MirrorSkillSnapshot[],
  dAttrs: MirrorAttrsSnapshot, dBuilding: MirrorSkillSnapshot[]
): { result: ColiseuResult; log: CombatLogEntry[]; challengerHpFinal: number; defenderHpFinal: number } {
  let cHp = 80 + cAttrs.vitalidade * 5
  let dHp = 80 + dAttrs.vitalidade * 5
  let cEter = cAttrs.eter_max
  let dEter = dAttrs.eter_max
  const log: CombatLogEntry[] = []

  // Determine turn order by speed
  const cFirst = cAttrs.velocidade > dAttrs.velocidade ? true
    : dAttrs.velocidade > cAttrs.velocidade ? false
    : Math.random() < 0.5

  for (let turn = 1; turn <= 30 && cHp > 0 && dHp > 0; turn++) {
    const order: Array<{ actor: 'challenger' | 'defender'; attrs: MirrorAttrsSnapshot; building: MirrorSkillSnapshot[]; hp: number; hpMax: number; eter: number }> = cFirst
      ? [
          { actor: 'challenger', attrs: cAttrs, building: cBuilding, hp: cHp, hpMax: 80 + cAttrs.vitalidade * 5, eter: cEter },
          { actor: 'defender', attrs: dAttrs, building: dBuilding, hp: dHp, hpMax: 80 + dAttrs.vitalidade * 5, eter: dEter },
        ]
      : [
          { actor: 'defender', attrs: dAttrs, building: dBuilding, hp: dHp, hpMax: 80 + dAttrs.vitalidade * 5, eter: dEter },
          { actor: 'challenger', attrs: cAttrs, building: cBuilding, hp: cHp, hpMax: 80 + cAttrs.vitalidade * 5, eter: cEter },
        ]

    for (const combatant of order) {
      if (cHp <= 0 || dHp <= 0) break
      const targetAttrs = combatant.actor === 'challenger' ? dAttrs : cAttrs
      const targetHp = combatant.actor === 'challenger' ? dHp : cHp

      const action = decideMirrorAction(combatant.building, combatant.hp, combatant.hpMax, combatant.eter, combatant.attrs)

      // Check dodge
      const dodgeChance = calcDodgeChance(targetAttrs.velocidade)
      if (Math.random() * 100 <= dodgeChance && action.damage > 0) {
        log.push({ turn, actor: combatant.actor, action: `${action.name} (desviado)`, damage: 0, hpAfter: targetHp })
        // Debit eter even on dodge
        if (combatant.actor === 'challenger') cEter -= action.eterCost
        else dEter -= action.eterCost
        continue
      }

      const result = calcSkillDamage({
        baseDamage: action.base, ataqueFactor: action.ataqueFactor, magiaFactor: action.magiaFactor,
        attackerAtaque: combatant.attrs.ataque, attackerMagia: combatant.attrs.magia,
        targetDefesa: targetAttrs.defesa,
      })
      const dmg = Math.max(1, Math.floor(result.afterDefense))

      if (combatant.actor === 'challenger') {
        dHp = Math.max(0, dHp - dmg)
        cEter -= action.eterCost
        log.push({ turn, actor: 'challenger', action: action.name, damage: dmg, hpAfter: dHp })
      } else {
        cHp = Math.max(0, cHp - dmg)
        dEter -= action.eterCost
        log.push({ turn, actor: 'defender', action: action.name, damage: dmg, hpAfter: cHp })
      }
    }
  }

  const result: ColiseuResult = cHp <= 0 && dHp <= 0 ? 'draw'
    : cHp <= 0 ? 'loss' : dHp <= 0 ? 'win'
    : cHp > dHp ? 'win' : dHp > cHp ? 'loss' : 'draw'

  return { result, log, challengerHpFinal: cHp, defenderHpFinal: dHp }
}

function decideMirrorAction(
  building: MirrorSkillSnapshot[], hp: number, hpMax: number, eter: number, attrs: MirrorAttrsSnapshot
): { name: string; base: number; ataqueFactor: number; magiaFactor: number; eterCost: number; damage: number } {
  const hpPercent = hp / hpMax
  const activeSkills = building.filter((s) => s.skill_type === 'ativa')

  // 1. If low HP, try heal
  if (hpPercent < 0.25) {
    const healSkill = activeSkills.find((s) => (s.formula.heal ?? 0) > 0 && eter >= s.eter_cost)
    if (healSkill) {
      return {
        name: healSkill.skill_name, base: healSkill.formula.base ?? 0,
        ataqueFactor: healSkill.formula.ataque_factor ?? 0, magiaFactor: healSkill.formula.magia_factor ?? 0,
        eterCost: healSkill.eter_cost, damage: 0,
      }
    }
  }

  // 2. Best damage skill with enough eter
  let bestSkill: MirrorSkillSnapshot | null = null
  let bestPotential = -1
  for (const s of activeSkills) {
    if (eter < s.eter_cost) continue
    const potential = (s.formula.base ?? 0) + (s.formula.ataque_factor ?? 0) * attrs.ataque + (s.formula.magia_factor ?? 0) * attrs.magia
    if (potential > bestPotential) {
      bestPotential = potential
      bestSkill = s
    }
  }

  if (bestSkill) {
    return {
      name: bestSkill.skill_name, base: bestSkill.formula.base ?? 0,
      ataqueFactor: bestSkill.formula.ataque_factor ?? 0, magiaFactor: bestSkill.formula.magia_factor ?? 0,
      eterCost: bestSkill.eter_cost, damage: bestPotential,
    }
  }

  // 3. Basic attack
  return { name: 'Ataque Básico', base: 8, ataqueFactor: 0.6, magiaFactor: 0, eterCost: 0, damage: 8 + attrs.ataque * 0.6 }
}

// ─── Challenge Flow ───────────────────────────────────────────────────────

export async function challengeMirror(
  challengerId: string, userId: string, defenderCharacterId: string
): Promise<{ success: boolean; error?: string; result?: ColiseuResult; pointsDelta?: number; newPoints?: number; log?: CombatLogEntry[] }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters').select('id, name').eq('id', challengerId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  if (challengerId === defenderCharacterId) return { success: false, error: 'Não pode desafiar seu próprio Espelho.' }

  const cMirror = await getOrCreateMirror(challengerId)
  const dMirror = await getOrCreateMirror(defenderCharacterId)

  if (Math.abs(cMirror.coliseuPoints - dMirror.coliseuPoints) > 200) {
    return { success: false, error: 'Adversário fora do range de pontos.' }
  }

  // Daily challenge limit
  const today = new Date().toISOString().split('T')[0]
  let used = cMirror.dailyChallengesUsed
  if (cMirror.lastChallengeDate !== today) used = 0

  const cost = getChallengeExtraCost(used)
  if (cost > 0) {
    const { data: wallet } = await supabase
      .from('character_wallet').select('premium_currency').eq('character_id', challengerId).single()
    if (!wallet || (wallet.premium_currency ?? 0) < cost) {
      return { success: false, error: `Gemas insuficientes. Necessário: ${cost}.` }
    }
    await supabase.from('character_wallet')
      .update({ premium_currency: (wallet.premium_currency ?? 0) - cost } as never)
      .eq('character_id', challengerId)
  }

  // Simulate
  const combat = simulateCombat(cMirror.attrsSnapshot, cMirror.buildingSnapshot, dMirror.attrsSnapshot, dMirror.buildingSnapshot)
  const delta = calcPointsDelta(cMirror.coliseuPoints, dMirror.coliseuPoints, combat.result)
  const defDelta = -delta // Inverse for defender

  const newCPoints = Math.max(0, cMirror.coliseuPoints + delta)
  const newDPoints = Math.max(0, dMirror.coliseuPoints + defDelta)

  // Update mirrors
  const mirrorTbl = supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } }

  await mirrorTbl.from('character_mirrors').update({
    coliseu_points: newCPoints,
    wins: cMirror.wins + (combat.result === 'win' ? 1 : 0),
    losses: cMirror.losses + (combat.result === 'loss' ? 1 : 0),
    daily_challenges_used: used + 1,
    last_challenge_date: today,
  }).eq('character_id', challengerId)

  await mirrorTbl.from('character_mirrors').update({
    coliseu_points: newDPoints,
    wins: dMirror.wins + (combat.result === 'loss' ? 1 : 0),
    losses: dMirror.losses + (combat.result === 'win' ? 1 : 0),
  }).eq('character_id', defenderCharacterId)

  // Record challenge
  await (supabase as unknown as { from: (t: string) => { insert: (d: Record<string, unknown>) => Promise<unknown> } })
    .from('coliseu_challenges').insert({
      challenger_id: challengerId,
      defender_mirror_id: defenderCharacterId,
      challenger_points_before: cMirror.coliseuPoints,
      defender_points_before: dMirror.coliseuPoints,
      points_delta: delta,
      result: combat.result,
      combat_log: combat.log as unknown,
    })

  // Notify defender
  const resultLabel = combat.result === 'win' ? 'derrota' : combat.result === 'loss' ? 'vitória' : 'empate'
  await createNotification({
    characterId: defenderCharacterId, type: 'general',
    title: 'Coliseu — Seu Espelho foi desafiado',
    body: `${character.name} desafiou seu Espelho. Resultado: ${resultLabel}. Pontos: ${dMirror.coliseuPoints} → ${newDPoints}.`,
    actionUrl: '/coliseu',
  })

  if (combat.result === 'win') {
    const { checkAchievements } = await import('./achievements')
    await checkAchievements(challengerId, 'pvp_win', { modality: 'coliseu' }).catch(() => {})
    const { updateWeeklyProgress } = await import('./weekly')
    await updateWeeklyProgress(challengerId, 'win_pvp_ranked').catch(() => {})
    const { updateSocietyMissionProgress } = await import('./society_missions')
    await updateSocietyMissionProgress(challengerId, 'collective_pvp_wins').catch(() => {})
  }

  return { success: true, result: combat.result, pointsDelta: delta, newPoints: newCPoints, log: combat.log }
}

// ─── Season Rewards ───────────────────────────────────────────────────────

export async function distributeSeasonRewards(): Promise<{ success: boolean; error?: string; rewarded?: number }> {
  const supabase = await createClient()

  const { data: season } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .from('coliseu_seasons').select('*').eq('status', 'active').single()
  if (!season) return { success: false, error: 'Nenhuma quinzena ativa.' }
  if (new Date(season.ends_at as string) > new Date()) return { success: false, error: 'Quinzena ainda não terminou.' }
  if (season.rewards_distributed) return { success: false, error: 'Prêmios já distribuídos.' }

  // Get ranking
  const { data: mirrors } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (k: string, o: Record<string, boolean>) => Promise<{ data: Array<Record<string, unknown>> | null }> } } })
    .from('character_mirrors').select('character_id, coliseu_points').order('coliseu_points', { ascending: false })

  const ranked = mirrors ?? []
  let rewarded = 0

  // Get participants (at least 1 challenge in this season)
  const { data: participants } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { gte: (k: string, v: string) => Promise<{ data: Array<Record<string, unknown>> | null }> } } })
    .from('coliseu_challenges').select('challenger_id').gte('created_at', season.starts_at as string)
  const participantIds = new Set((participants ?? []).map((p) => p.challenger_id as string))

  const REWARDS: Array<{ positions: number[]; essencias: number; tickets: number; gemas: number }> = [
    { positions: [1], essencias: 500, tickets: 5, gemas: 50 },
    { positions: [2, 3], essencias: 300, tickets: 3, gemas: 25 },
    { positions: [4, 5, 6, 7, 8, 9, 10], essencias: 150, tickets: 1, gemas: 0 },
    { positions: Array.from({ length: 40 }, (_, i) => i + 11), essencias: 50, tickets: 0, gemas: 0 },
  ]

  for (const tier of REWARDS) {
    for (const pos of tier.positions) {
      if (pos > ranked.length) continue
      const charId = ranked[pos - 1].character_id as string
      const { data: wallet } = await supabase
        .from('character_wallet').select('essencia, summon_tickets, premium_currency')
        .eq('character_id', charId).single()
      if (wallet) {
        await supabase.from('character_wallet').update({
          essencia: wallet.essencia + tier.essencias,
          summon_tickets: wallet.summon_tickets + tier.tickets,
          premium_currency: (wallet.premium_currency ?? 0) + tier.gemas,
        } as never).eq('character_id', charId)
        rewarded++
      }
    }
  }

  // Participation reward
  for (const charId of Array.from(participantIds)) {
    const { data: wallet } = await supabase
      .from('character_wallet').select('essencia').eq('character_id', charId).single()
    if (wallet) {
      await supabase.from('character_wallet').update({
        essencia: wallet.essencia + 20,
      } as never).eq('character_id', charId)
    }
  }

  // Reset all points to 500
  await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => Promise<unknown> } })
    .from('character_mirrors').update({ coliseu_points: 500, wins: 0, losses: 0, daily_challenges_used: 0 })

  // Mark season finished
  await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } })
    .from('coliseu_seasons').update({ status: 'finished', rewards_distributed: true }).eq('id', season.id as string)

  // Create new season
  await (supabase as unknown as { from: (t: string) => { insert: (d: Record<string, unknown>) => Promise<unknown> } })
    .from('coliseu_seasons').insert({
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 15 * 86400000).toISOString(),
      status: 'active',
    })

  return { success: true, rewarded }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapMirror(r: Record<string, unknown>): CharacterMirror {
  return {
    characterId: r.character_id as string,
    attrsSnapshot: (r.attrs_snapshot ?? {}) as unknown as MirrorAttrsSnapshot,
    buildingSnapshot: (r.building_snapshot ?? []) as unknown as MirrorSkillSnapshot[],
    coliseuPoints: (r.coliseu_points as number) ?? 500,
    wins: (r.wins as number) ?? 0,
    losses: (r.losses as number) ?? 0,
    dailyChallengesUsed: (r.daily_challenges_used as number) ?? 0,
    lastChallengeDate: r.last_challenge_date as string | null,
    updatedAt: r.updated_at as string,
  }
}

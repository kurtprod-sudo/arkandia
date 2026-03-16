// ---------------------------------------------------------------------------
// Boss de Mundo Semanal — Fase 34
// Referência: GDD_Sistemas §6.15
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { calcSkillDamage, calcDodgeChance } from './attributes'
import { createNotification } from './notifications'
import { grantXp } from './levelup'
import { decideNpcAction, type NpcSkill } from './npc_ai'

const BOSS_VELOCIDADE = 15

export interface WorldBossInstance {
  id: string; name: string; loreText: string | null; hpMax: number; hpCurrent: number
  status: string; skills: NpcSkill[]; behavior: string; windowStart: string; windowEnd: string
  rewardPool: { libras: number; essencia: number; xp: number }; totalDamageDealt: number
}

export interface BossContribution {
  bossId: string; characterId: string; damageDealt: number
  attacksToday: number; lastAttackDate: string | null; rewardClaimed: boolean
}

export interface BossTurnResult {
  actor: 'player' | 'boss'; actionType: string; damageDealt: number
  narrativeText: string; playerHpAfter: number; bossHpAfter: number
  bossDefeated: boolean; playerDefeated: boolean
}

type SBU = { from: (t: string) => Record<string, unknown> }

function mapBoss(r: Record<string, unknown>): WorldBossInstance {
  const pool = (r.reward_pool ?? {}) as Record<string, unknown>
  return {
    id: r.id as string, name: r.name as string, loreText: r.lore_text as string | null,
    hpMax: r.hp_max as number, hpCurrent: r.hp_current as number, status: r.status as string,
    skills: (r.skills as unknown as NpcSkill[]) ?? [], behavior: (r.behavior as string) ?? 'aggressive',
    windowStart: r.window_start as string, windowEnd: r.window_end as string,
    rewardPool: { libras: (pool.libras as number) ?? 0, essencia: (pool.essencia as number) ?? 0, xp: (pool.xp as number) ?? 0 },
    totalDamageDealt: (r.total_damage_dealt as number) ?? 0,
  }
}

export async function getActiveBoss(): Promise<WorldBossInstance | null> {
  const supabase = await createClient()
  const { data } = await (supabase as unknown as SBU).from('world_boss_instances')
    .select('*').eq('status', 'active').maybeSingle() as { data: Record<string, unknown> | null }
  return data ? mapBoss(data) : null
}

export async function getBossWithContribution(characterId: string) {
  const supabase = await createClient()
  const boss = await getActiveBoss()

  // Also check defeated/expired
  let displayBoss = boss
  if (!displayBoss) {
    const { data } = await (supabase as unknown as SBU).from('world_boss_instances')
      .select('*').in('status', ['defeated', 'expired']).order('created_at', { ascending: false }).limit(1).maybeSingle() as { data: Record<string, unknown> | null }
    if (data) displayBoss = mapBoss(data)
  }

  let contribution: BossContribution | null = null
  if (displayBoss) {
    const { data: c } = await (supabase as unknown as SBU).from('world_boss_contributions')
      .select('*').eq('boss_id', displayBoss.id).eq('character_id', characterId).maybeSingle() as { data: Record<string, unknown> | null }
    if (c) {
      contribution = {
        bossId: c.boss_id as string, characterId: c.character_id as string,
        damageDealt: (c.damage_dealt as number) ?? 0, attacksToday: (c.attacks_today as number) ?? 0,
        lastAttackDate: c.last_attack_date as string | null, rewardClaimed: (c.reward_claimed as boolean) ?? false,
      }
    }
  }

  // Ranking top 10
  const ranking: Array<{ characterName: string; damageDealt: number; rank: number }> = []
  if (displayBoss) {
    const { data: contribs } = await (supabase as unknown as SBU).from('world_boss_contributions')
      .select('damage_dealt, characters(name)').eq('boss_id', displayBoss.id)
      .order('damage_dealt', { ascending: false }).limit(10) as { data: Array<Record<string, unknown>> | null }
    (contribs ?? []).forEach((c, i) => {
      ranking.push({
        characterName: ((c.characters as Record<string, unknown>)?.name as string) ?? '?',
        damageDealt: c.damage_dealt as number,
        rank: i + 1,
      })
    })
  }

  return { boss: displayBoss, contribution, ranking }
}

export async function startBossAttack(characterId: string, userId: string) {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters').select('id, recovery_until, injured_until').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  if (character.recovery_until && new Date(character.recovery_until) > new Date()) return { success: false, error: 'Em recuperação.' }
  if (character.injured_until && new Date(character.injured_until) > new Date()) return { success: false, error: 'Ferido.' }

  const boss = await getActiveBoss()
  if (!boss) return { success: false, error: 'Nenhum boss ativo.' }
  if (new Date() < new Date(boss.windowStart) || new Date() > new Date(boss.windowEnd)) {
    return { success: false, error: 'Fora da janela de combate.' }
  }

  // Check daily limit
  const today = new Date().toISOString().split('T')[0]
  const { data: contrib } = await (supabase as unknown as SBU).from('world_boss_contributions')
    .select('attacks_today, last_attack_date').eq('boss_id', boss.id).eq('character_id', characterId).maybeSingle() as { data: Record<string, unknown> | null }

  let attacksToday = 0
  if (contrib) {
    attacksToday = (contrib.last_attack_date as string) === today ? (contrib.attacks_today as number) : 0
  }
  if (attacksToday >= 3) return { success: false, error: 'Limite de 3 ataques por dia atingido.' }

  // Increment attacks
  if (contrib) {
    await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } } })
      .from('world_boss_contributions').update({
        attacks_today: attacksToday + 1, last_attack_date: today,
      }).eq('boss_id', boss.id).eq('character_id', characterId)
  } else {
    await (supabase as unknown as SBU).from('world_boss_contributions').insert({
      boss_id: boss.id, character_id: characterId, damage_dealt: 0,
      attacks_today: 1, last_attack_date: today,
    }) as unknown
  }

  const { data: attrs } = await supabase.from('character_attributes')
    .select('hp_atual, hp_max, eter_atual, eter_max').eq('character_id', characterId).single()

  const { data: buildingRaw } = await supabase.from('character_building')
    .select('slot, skills(id, name, eter_cost)').eq('character_id', characterId).order('slot')

  const building = (buildingRaw ?? []).map((b) => ({
    slot: b.slot as number,
    skill: b.skills ? {
      id: (b.skills as Record<string, unknown>).id as string,
      name: (b.skills as Record<string, unknown>).name as string,
      eterCost: (b.skills as Record<string, unknown>).eter_cost as number,
    } : null,
  }))

  return {
    success: true, bossId: boss.id, bossHpCurrent: boss.hpCurrent, bossHpMax: boss.hpMax,
    bossName: boss.name, bossSkills: boss.skills,
    playerHp: attrs?.hp_atual ?? 100, playerHpMax: attrs?.hp_max ?? 100,
    playerEter: attrs?.eter_atual ?? 50, playerEterMax: attrs?.eter_max ?? 50,
    attacksRemaining: 3 - (attacksToday + 1), building,
  }
}

export async function processBossAction(
  bossId: string, characterId: string, userId: string,
  action: { type: 'ataque_basico' | 'skill'; skillName?: string }
): Promise<{ success: boolean; error?: string; turnResult?: BossTurnResult }> {
  const supabase = await createClient()

  const { data: bossData } = await (supabase as unknown as SBU).from('world_boss_instances')
    .select('*').eq('id', bossId).eq('status', 'active').single() as { data: Record<string, unknown> | null }
  if (!bossData) return { success: false, error: 'Boss não encontrado.' }
  const boss = mapBoss(bossData)

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  const { data: playerAttrs } = await supabase.from('character_attributes')
    .select('*').eq('character_id', characterId).single()
  if (!playerAttrs) return { success: false, error: 'Atributos não encontrados.' }

  // Player turn
  let playerDamage = 0
  let playerNarrative = ''

  if (action.type === 'ataque_basico') {
    const dodge = calcDodgeChance(BOSS_VELOCIDADE)
    if (Math.random() * 100 <= dodge) {
      playerNarrative = 'Ataque básico desviado.'
    } else {
      const result = calcSkillDamage({
        baseDamage: 8, ataqueFactor: 0.6,
        attackerAtaque: playerAttrs.ataque, attackerMagia: playerAttrs.magia,
        targetDefesa: 30, // Boss defense
      })
      playerDamage = Math.max(1, Math.floor(result.afterDefense))
      playerNarrative = `Ataque básico: ${playerDamage} de dano.`
    }
  } else if (action.type === 'skill' && action.skillName) {
    const { data: allSlots } = await supabase.from('character_building')
      .select('skills(name, formula, eter_cost)').eq('character_id', characterId)
    const matchingSlot = (allSlots ?? []).find(
      (s) => (s.skills as Record<string, unknown> | null)?.name === action.skillName
    )
    if (!matchingSlot?.skills) return { success: false, error: 'Skill não encontrada.' }
    const skill = matchingSlot.skills as Record<string, unknown>
    const formula = (skill.formula ?? {}) as Record<string, number>
    const eterCost = (skill.eter_cost as number) ?? 0
    if (playerAttrs.eter_atual < eterCost) return { success: false, error: 'Éter insuficiente.' }

    const dodge = calcDodgeChance(BOSS_VELOCIDADE)
    if (Math.random() * 100 <= dodge) {
      playerNarrative = `${skill.name as string} desviada.`
    } else {
      const result = calcSkillDamage({
        baseDamage: formula.base ?? 0, ataqueFactor: formula.ataque_factor,
        magiaFactor: formula.magia_factor, attackerAtaque: playerAttrs.ataque,
        attackerMagia: playerAttrs.magia, targetDefesa: 30,
      })
      playerDamage = Math.max(1, Math.floor(result.afterDefense))
      playerNarrative = `${skill.name as string}: ${playerDamage} de dano.`
    }
    await supabase.from('character_attributes')
      .update({ eter_atual: playerAttrs.eter_atual - eterCost }).eq('character_id', characterId)
  }

  // Apply damage to boss
  const newBossHp = Math.max(0, boss.hpCurrent - playerDamage)
  await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } })
    .from('world_boss_instances').update({
      hp_current: newBossHp, total_damage_dealt: boss.totalDamageDealt + playerDamage,
    }).eq('id', bossId)

  // Update contribution
  await (supabase as unknown as SBU).from('world_boss_contributions').upsert({
    boss_id: bossId, character_id: characterId,
  }, { onConflict: 'boss_id,character_id' }) as unknown

  // Increment damage (separate query to avoid race)
  const { data: curContrib } = await (supabase as unknown as SBU).from('world_boss_contributions')
    .select('damage_dealt').eq('boss_id', bossId).eq('character_id', characterId).single() as { data: Record<string, unknown> | null }
  if (curContrib) {
    await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } } })
      .from('world_boss_contributions').update({
        damage_dealt: (curContrib.damage_dealt as number) + playerDamage,
      }).eq('boss_id', bossId).eq('character_id', characterId)
  }

  // Check boss defeated
  if (newBossHp <= 0) {
    await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } })
      .from('world_boss_instances').update({ status: 'defeated' }).eq('id', bossId)
    await supabase.rpc('restore_combat_vitals', { p_character_id: characterId })
    return {
      success: true,
      turnResult: {
        actor: 'player', actionType: action.type, damageDealt: playerDamage,
        narrativeText: `${playerNarrative} ${boss.name} foi derrotado!`,
        playerHpAfter: playerAttrs.hp_max, bossHpAfter: 0,
        bossDefeated: true, playerDefeated: false,
      },
    }
  }

  // Boss turn
  const bossAction = decideNpcAction(boss.skills, newBossHp, boss.hpMax, boss.behavior)
  let bossDamage = 0
  let bossNarrative = ''

  const playerDodge = calcDodgeChance(playerAttrs.velocidade)
  if (Math.random() * 100 <= playerDodge) {
    bossNarrative = `${boss.name} — ataque desviado.`
  } else {
    const result = calcSkillDamage({
      baseDamage: bossAction.base, ataqueFactor: bossAction.ataque_factor ?? 0,
      magiaFactor: bossAction.magia_factor ?? 0,
      attackerAtaque: 80, attackerMagia: 80, // Boss stats
      targetDefesa: playerAttrs.defesa,
    })
    bossDamage = Math.max(1, Math.floor(result.afterDefense))
    bossNarrative = `${boss.name} — ${bossAction.name}: ${bossDamage} de dano.`
  }

  const playerHpAfter = Math.max(0, playerAttrs.hp_atual - bossDamage)
  await supabase.from('character_attributes')
    .update({ hp_atual: playerHpAfter }).eq('character_id', characterId)

  if (playerHpAfter <= 0) {
    await supabase.rpc('restore_combat_vitals', { p_character_id: characterId })
    return {
      success: true,
      turnResult: {
        actor: 'boss', actionType: bossAction.name, damageDealt: bossDamage,
        narrativeText: `${playerNarrative} ${bossNarrative} Você foi derrotado.`,
        playerHpAfter: 0, bossHpAfter: newBossHp,
        bossDefeated: false, playerDefeated: true,
      },
    }
  }

  return {
    success: true,
    turnResult: {
      actor: 'boss', actionType: bossAction.name, damageDealt: bossDamage,
      narrativeText: `${playerNarrative} ${bossNarrative}`,
      playerHpAfter, bossHpAfter: newBossHp,
      bossDefeated: false, playerDefeated: false,
    },
  }
}

export async function endBossAttack(bossId: string, characterId: string, userId: string) {
  try {
    const supabase = await createClient()
    const { data: character } = await supabase
      .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
    if (!character) return { success: false, error: 'Acesso negado.' }
    await supabase.rpc('restore_combat_vitals', { p_character_id: characterId })
    return { success: true }
  } catch {
    return { success: false, error: 'Erro interno.' }
  }
}

export async function claimBossReward(bossId: string, characterId: string, userId: string) {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: bossData } = await (supabase as unknown as SBU).from('world_boss_instances')
    .select('*').eq('id', bossId).single() as { data: Record<string, unknown> | null }
  if (!bossData) return { success: false, error: 'Boss não encontrado.' }
  const boss = mapBoss(bossData)
  if (boss.status !== 'defeated' && boss.status !== 'expired') return { success: false, error: 'Boss ainda ativo.' }

  const { data: contrib } = await (supabase as unknown as SBU).from('world_boss_contributions')
    .select('damage_dealt, reward_claimed').eq('boss_id', bossId).eq('character_id', characterId).single() as { data: Record<string, unknown> | null }
  if (!contrib) return { success: false, error: 'Sem contribuição.' }
  if (contrib.reward_claimed) return { success: false, error: 'Já resgatada.' }
  if ((contrib.damage_dealt as number) <= 0) return { success: false, error: 'Sem dano registrado.' }

  const pct = (contrib.damage_dealt as number) / boss.hpMax
  const libras = Math.max(1, Math.floor(pct * boss.rewardPool.libras))
  const essencia = Math.max(1, Math.floor(pct * boss.rewardPool.essencia))
  const xp = Math.max(1, Math.floor(pct * boss.rewardPool.xp))

  const { data: wallet } = await supabase.from('character_wallet')
    .select('libras, essencia').eq('character_id', characterId).single()
  if (wallet) {
    await supabase.from('character_wallet').update({
      libras: wallet.libras + libras, essencia: wallet.essencia + essencia,
    } as never).eq('character_id', characterId)
  }

  await grantXp(characterId, xp, supabase)

  await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } } })
    .from('world_boss_contributions').update({ reward_claimed: true })
    .eq('boss_id', bossId).eq('character_id', characterId)

  await createNotification({
    characterId, type: 'general',
    title: `Boss derrotado — Recompensa`,
    body: `+${libras} Libras, +${essencia} Essências, +${xp} XP.`,
    actionUrl: '/boss',
  })

  return { success: true, rewards: { libras, essencia, xp } }
}

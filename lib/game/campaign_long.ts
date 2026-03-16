// ---------------------------------------------------------------------------
// Campanha Longa — Fase 37
// Referência: GDD_Sistemas §7, GDD_Mundo §5
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'
import { createEvent } from './events'
import { startCombat } from './combat'
import type {
  CampaignStage, StageProgress, NpcStageAttrs, NpcKeyHistory, LoreFragment,
} from '@/types'

// Workaround: tables not yet in generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SBU = { from: (t: string) => any }

// ---------------------------------------------------------------------------
// Fórmula de scaling (canônica — exportada para UI e testes)
// ---------------------------------------------------------------------------

export function calcStageNpcAttrs(
  chapterNumber: number,
  stageNumber: number,
  difficulty: 'normal' | 'hard'
): NpcStageAttrs {
  const base = 10 + (chapterNumber * 8) + (stageNumber * 2)
  const multiplier = difficulty === 'hard' ? 1.5 : 1
  const scaled = Math.ceil(base * multiplier)
  const hp = Math.ceil((80 + scaled * 5) * multiplier)
  const eter = Math.ceil((40 + chapterNumber * 10 + stageNumber * 3) * multiplier)
  return {
    ataque: scaled,
    magia: scaled,
    defesa: Math.ceil(scaled * 0.7),
    vitalidade: scaled,
    velocidade: scaled,
    precisao: scaled,
    tenacidade: Math.ceil(scaled * 0.8),
    hp_max: hp,
    hp_atual: hp,
    eter_max: eter,
    eter_atual: eter,
  }
}

// ---------------------------------------------------------------------------
// Nação por capítulo
// ---------------------------------------------------------------------------

const CHAPTER_NATIONS: Record<number, string> = {
  1: 'valoria',
  2: 'eryuell',
  3: 'duren',
}

export function getChapterNation(chapterNumber: number): string {
  return CHAPTER_NATIONS[chapterNumber] ?? 'desconhecida'
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function getStageProgress(
  characterId: string,
  campaignSlug = 'aventura'
): Promise<StageProgress[]> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return []

  const { data } = await sb
    .from('campaign_stage_progress')
    .select('chapter_number, stage_number, difficulty, completed_at')
    .eq('character_id', characterId)
    .eq('campaign_id', campaign.id)
    .order('chapter_number', { ascending: true })
    .order('stage_number', { ascending: true })

  return (data ?? []).map((r: Record<string, unknown>) => ({
    chapterNumber: r.chapter_number as number,
    stageNumber: r.stage_number as number,
    difficulty: r.difficulty as 'normal' | 'hard',
    completedAt: r.completed_at as string,
  }))
}

export async function getCurrentStage(
  characterId: string,
  campaignSlug = 'aventura'
): Promise<{
  stage: CampaignStage
  npcAttrs: NpcStageAttrs
  isHardAvailable: boolean
  hardCompleted: boolean
} | null> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id, total_chapters').eq('slug', campaignSlug).single()
  if (!campaign) return null

  const progress = await getStageProgress(characterId, campaignSlug)

  // Find the next incomplete normal stage
  for (let ch = 1; ch <= (campaign.total_chapters as number); ch++) {
    for (let st = 1; st <= 10; st++) {
      const normalDone = progress.some(
        (p) => p.chapterNumber === ch && p.stageNumber === st && p.difficulty === 'normal'
      )
      if (!normalDone) {
        // This is the next normal stage
        const { data: stageRow } = await sb
          .from('campaign_stages').select('*')
          .eq('campaign_id', campaign.id)
          .eq('chapter_number', ch)
          .eq('stage_number', st)
          .eq('difficulty', 'normal')
          .single()
        if (!stageRow) return null

        const stage = mapStage(stageRow as Record<string, unknown>)
        const npcAttrs = stage.npcSnapshotOverride ?? calcStageNpcAttrs(ch, st, 'normal')
        const hardDone = progress.some(
          (p) => p.chapterNumber === ch && p.stageNumber === st && p.difficulty === 'hard'
        )
        return { stage, npcAttrs, isHardAvailable: false, hardCompleted: hardDone }
      }
    }
  }

  // All normal done — check for hard stages
  for (let ch = 1; ch <= (campaign.total_chapters as number); ch++) {
    for (let st = 1; st <= 10; st++) {
      const hardDone = progress.some(
        (p) => p.chapterNumber === ch && p.stageNumber === st && p.difficulty === 'hard'
      )
      if (!hardDone) {
        const { data: stageRow } = await sb
          .from('campaign_stages').select('*')
          .eq('campaign_id', campaign.id)
          .eq('chapter_number', ch)
          .eq('stage_number', st)
          .eq('difficulty', 'hard')
          .single()
        if (!stageRow) return null

        const stage = mapStage(stageRow as Record<string, unknown>)
        const npcAttrs = stage.npcSnapshotOverride ?? calcStageNpcAttrs(ch, st, 'hard')
        return { stage, npcAttrs, isHardAvailable: true, hardCompleted: false }
      }
    }
  }

  return null // all done
}

export async function getChapterStages(
  characterId: string,
  campaignSlug: string,
  chapterNumber: number
): Promise<Array<CampaignStage & {
  normalCompleted: boolean
  hardCompleted: boolean
  hardAvailable: boolean
}>> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return []

  const { data: stages } = await sb
    .from('campaign_stages').select('*')
    .eq('campaign_id', campaign.id)
    .eq('chapter_number', chapterNumber)
    .order('stage_number', { ascending: true })
    .order('difficulty', { ascending: true })

  if (!stages || stages.length === 0) return []

  const progress = await getStageProgress(characterId, campaignSlug)
  const chapterProgress = progress.filter((p) => p.chapterNumber === chapterNumber)

  // Group by stage_number
  const stageMap = new Map<number, { normal?: CampaignStage; hard?: CampaignStage }>()
  for (const row of stages as Array<Record<string, unknown>>) {
    const s = mapStage(row)
    const existing = stageMap.get(s.stageNumber) ?? {}
    if (s.difficulty === 'normal') existing.normal = s
    else existing.hard = s
    stageMap.set(s.stageNumber, existing)
  }

  const result: Array<CampaignStage & {
    normalCompleted: boolean; hardCompleted: boolean; hardAvailable: boolean
  }> = []

  for (let st = 1; st <= 10; st++) {
    const entry = stageMap.get(st)
    if (!entry?.normal) continue

    const normalDone = chapterProgress.some(
      (p) => p.stageNumber === st && p.difficulty === 'normal'
    )
    const hardDone = chapterProgress.some(
      (p) => p.stageNumber === st && p.difficulty === 'hard'
    )
    // Hard available if normal of this stage is completed
    const hardAvailable = normalDone

    result.push({
      ...entry.normal,
      normalCompleted: normalDone,
      hardCompleted: hardDone,
      hardAvailable,
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// Combate
// ---------------------------------------------------------------------------

export async function startStageCombat(
  characterId: string,
  userId: string,
  campaignSlug: string,
  chapterNumber: number,
  stageNumber: number,
  difficulty: 'normal' | 'hard'
): Promise<{
  success: boolean; error?: string
  sessionId?: string
  npcName?: string
  npcChallengePhrase?: string
  npcKey?: string | null
}> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return { success: false, error: 'Campanha não encontrada.' }

  // Validate stage exists
  const { data: stageRow } = await sb
    .from('campaign_stages').select('*')
    .eq('campaign_id', campaign.id)
    .eq('chapter_number', chapterNumber)
    .eq('stage_number', stageNumber)
    .eq('difficulty', difficulty)
    .single()
  if (!stageRow) return { success: false, error: 'Fase não encontrada.' }

  // Check already completed
  const { data: alreadyDone } = await sb
    .from('campaign_stage_progress')
    .select('id')
    .eq('character_id', characterId)
    .eq('campaign_id', campaign.id)
    .eq('chapter_number', chapterNumber)
    .eq('stage_number', stageNumber)
    .eq('difficulty', difficulty)
    .maybeSingle()
  if (alreadyDone) return { success: false, error: 'Fase já completada.' }

  // Validate availability
  if (difficulty === 'hard') {
    // Normal of same stage must be completed
    const { data: normalDone } = await sb
      .from('campaign_stage_progress')
      .select('id')
      .eq('character_id', characterId)
      .eq('campaign_id', campaign.id)
      .eq('chapter_number', chapterNumber)
      .eq('stage_number', stageNumber)
      .eq('difficulty', 'normal')
      .maybeSingle()
    if (!normalDone) return { success: false, error: 'Complete o modo Normal primeiro.' }
  } else {
    // Previous normal stage must be completed (stage 1 always available)
    if (stageNumber > 1) {
      const { data: prevDone } = await sb
        .from('campaign_stage_progress')
        .select('id')
        .eq('character_id', characterId)
        .eq('campaign_id', campaign.id)
        .eq('chapter_number', chapterNumber)
        .eq('stage_number', stageNumber - 1)
        .eq('difficulty', 'normal')
        .maybeSingle()
      if (!prevDone) return { success: false, error: 'Complete a fase anterior primeiro.' }
    }
    // For chapter > 1, stage 1 requires previous chapter stage 10 normal completed
    if (stageNumber === 1 && chapterNumber > 1) {
      const { data: prevChapterDone } = await sb
        .from('campaign_stage_progress')
        .select('id')
        .eq('character_id', characterId)
        .eq('campaign_id', campaign.id)
        .eq('chapter_number', chapterNumber - 1)
        .eq('stage_number', 10)
        .eq('difficulty', 'normal')
        .maybeSingle()
      if (!prevChapterDone) return { success: false, error: 'Complete o capítulo anterior primeiro.' }
    }
  }

  const stage = mapStage(stageRow as Record<string, unknown>)
  const npcAttrs = stage.npcSnapshotOverride ?? calcStageNpcAttrs(chapterNumber, stageNumber, difficulty)

  // Create phantom NPC character
  const { data: npcChar } = await supabase
    .from('characters')
    .insert({
      user_id: userId,
      name: stage.npcName,
      level: 1,
      status: 'active',
      xp: 0,
      xp_to_next_level: 9999,
    } as never)
    .select('id').single()

  if (!npcChar) return { success: false, error: 'Erro ao criar NPC.' }

  await supabase.from('character_attributes').upsert({
    character_id: npcChar.id,
    ataque: npcAttrs.ataque,
    magia: npcAttrs.magia,
    defesa: npcAttrs.defesa,
    vitalidade: npcAttrs.vitalidade,
    velocidade: npcAttrs.velocidade,
    precisao: npcAttrs.precisao,
    tenacidade: npcAttrs.tenacidade,
    capitania: 0,
    eter_max: npcAttrs.eter_max,
    eter_atual: npcAttrs.eter_atual,
    hp_max: npcAttrs.hp_max,
    hp_atual: npcAttrs.hp_atual,
    moral: 100,
    attribute_points: 0,
  } as never, { onConflict: 'character_id' })

  const combatResult = await startCombat(characterId, npcChar.id, 'duelo_livre', userId)

  if (!combatResult.success || !combatResult.sessionId) {
    await supabase.from('character_attributes').delete().eq('character_id', npcChar.id)
    await supabase.from('characters').delete().eq('id', npcChar.id)
    return { success: false, error: combatResult.error ?? 'Erro ao iniciar combate.' }
  }

  return {
    success: true,
    sessionId: combatResult.sessionId,
    npcName: stage.npcName,
    npcChallengePhrase: stage.npcChallengePhrase,
    npcKey: stage.npcKey,
  }
}

// ---------------------------------------------------------------------------
// Completar fase
// ---------------------------------------------------------------------------

export async function completeStage(
  characterId: string,
  userId: string,
  campaignSlug: string,
  chapterNumber: number,
  stageNumber: number,
  difficulty: 'normal' | 'hard',
  combatSessionId: string
): Promise<{
  success: boolean; error?: string
  rewards?: { xp: number; libras: number }
  loreUnlocked?: boolean
  chapterCompleted?: boolean
  hardChapterCompleted?: boolean
}> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return { success: false, error: 'Campanha não encontrada.' }

  // Validate combat session
  const { data: session } = await supabase
    .from('combat_sessions').select('status, winner_id, challenger_id, defender_id')
    .eq('id', combatSessionId).single()
  if (!session) return { success: false, error: 'Sessão de combate não encontrada.' }
  if (session.status !== 'finished') return { success: false, error: 'Combate ainda em andamento.' }
  if (session.winner_id !== characterId) return { success: false, error: 'Você foi derrotado. Tente novamente.' }

  // Check not already completed
  const { data: alreadyDone } = await sb
    .from('campaign_stage_progress')
    .select('id')
    .eq('character_id', characterId)
    .eq('campaign_id', campaign.id)
    .eq('chapter_number', chapterNumber)
    .eq('stage_number', stageNumber)
    .eq('difficulty', difficulty)
    .maybeSingle()
  if (alreadyDone) return { success: false, error: 'Fase já completada.' }

  // Get stage data
  const { data: stageRow } = await sb
    .from('campaign_stages').select('*')
    .eq('campaign_id', campaign.id)
    .eq('chapter_number', chapterNumber)
    .eq('stage_number', stageNumber)
    .eq('difficulty', difficulty)
    .single()
  if (!stageRow) return { success: false, error: 'Fase não encontrada.' }

  const rewards = (stageRow.rewards ?? { xp: 0, libras: 0 }) as { xp: number; libras: number; lore_fragment_key?: string | null }

  // 1. Mark stage as complete
  await sb.from('campaign_stage_progress').insert({
    character_id: characterId,
    campaign_id: campaign.id,
    chapter_number: chapterNumber,
    stage_number: stageNumber,
    difficulty,
  })

  // 2. Grant rewards
  if (rewards.xp > 0) {
    const { grantXp } = await import('./levelup')
    await grantXp(characterId, rewards.xp).catch(() => {})
  }
  if (rewards.libras > 0) {
    const { data: wallet } = await supabase
      .from('character_wallet').select('libras').eq('character_id', characterId).single()
    if (wallet) {
      await supabase.from('character_wallet').update({
        libras: wallet.libras + rewards.libras,
      } as never).eq('character_id', characterId)
    }
  }

  // 3. Lore fragment
  let loreUnlocked = false
  if (rewards.lore_fragment_key) {
    const { data: catalog } = await sb
      .from('lore_fragment_catalog')
      .select('*')
      .eq('fragment_key', rewards.lore_fragment_key)
      .maybeSingle()
    if (catalog) {
      await sb.from('lore_fragments').insert({
        character_id: characterId,
        fragment_key: catalog.fragment_key,
        title: catalog.title,
        content: catalog.content,
        nation: catalog.nation,
      })
      loreUnlocked = true
    }
  }

  // 4. Delete phantom NPC
  const npcId = session.defender_id === characterId ? session.challenger_id : session.defender_id
  if (npcId) {
    await supabase.from('character_attributes').delete().eq('character_id', npcId)
    await supabase.from('characters').delete().eq('id', npcId)
  }

  // 5. Check chapter completion (all 10 normal stages)
  let chapterCompleted = false
  if (difficulty === 'normal') {
    const { data: normalProgress } = await sb
      .from('campaign_stage_progress')
      .select('stage_number')
      .eq('character_id', characterId)
      .eq('campaign_id', campaign.id)
      .eq('chapter_number', chapterNumber)
      .eq('difficulty', 'normal')
    const normalCount = (normalProgress ?? []).length
    if (normalCount >= 10) {
      chapterCompleted = true
      const nation = getChapterNation(chapterNumber)
      await createNotification({
        characterId,
        type: 'general',
        title: `Capítulo ${chapterNumber} Concluído!`,
        body: `Você completou todas as fases de ${nation.charAt(0).toUpperCase() + nation.slice(1)}!`,
        actionUrl: '/campaign/aventura',
      })
    }
  }

  // 6. Check hard chapter completion (all 10 hard stages)
  let hardChapterCompleted = false
  if (difficulty === 'hard') {
    const { data: hardProgress } = await sb
      .from('campaign_stage_progress')
      .select('stage_number')
      .eq('character_id', characterId)
      .eq('campaign_id', campaign.id)
      .eq('chapter_number', chapterNumber)
      .eq('difficulty', 'hard')
    const hardCount = (hardProgress ?? []).length
    if (hardCount >= 10) {
      hardChapterCompleted = true
      await createNotification({
        characterId,
        type: 'general',
        title: `Capítulo ${chapterNumber} — Modo Difícil Concluído!`,
        body: 'Recompensa cosmética exclusiva desbloqueada!',
        actionUrl: '/campaign/aventura',
      })
    }
  }

  // 7. Create event
  await createEvent(supabase, {
    type: 'combat_finished',
    actorId: characterId,
    metadata: {
      system: 'campaign_long',
      campaignSlug,
      chapterNumber,
      stageNumber,
      difficulty,
    },
    isPublic: false,
  })

  // Hook chain
  const { checkAchievements } = await import('./achievements')
  await checkAchievements(characterId, 'campaign_stage_complete', { chapter: chapterNumber, stage: stageNumber, difficulty }).catch(() => {})
  const { updateWeeklyProgress } = await import('./weekly')
  await updateWeeklyProgress(characterId, 'complete_campaign_stages').catch(() => {})
  const { updateSocietyMissionProgress } = await import('./society_missions')
  await updateSocietyMissionProgress(characterId, 'collective_expeditions').catch(() => {})

  return {
    success: true,
    rewards: { xp: rewards.xp, libras: rewards.libras },
    loreUnlocked,
    chapterCompleted,
    hardChapterCompleted,
  }
}

// ---------------------------------------------------------------------------
// Lore Fragments
// ---------------------------------------------------------------------------

export async function getLoreFragments(
  characterId: string,
  nation?: string
): Promise<LoreFragment[]> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  let query = sb.from('lore_fragments')
    .select('fragment_key, title, content, nation, unlocked_at')
    .eq('character_id', characterId)
    .order('unlocked_at', { ascending: true })

  if (nation) {
    query = query.eq('nation', nation)
  }

  const { data } = await query

  return (data ?? []).map((r: Record<string, unknown>) => ({
    fragmentKey: r.fragment_key as string,
    title: r.title as string,
    content: r.content as string,
    nation: r.nation as string,
    unlockedAt: r.unlocked_at as string,
  }))
}

// ---------------------------------------------------------------------------
// NPC Key History
// ---------------------------------------------------------------------------

export async function getNpcKeyHistory(
  characterId: string,
  campaignSlug: string,
  npcKey: string
): Promise<NpcKeyHistory | null> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return null

  // Get all stages with this npc_key
  const { data: npcStages } = await sb
    .from('campaign_stages')
    .select('chapter_number, stage_number, difficulty, npc_name')
    .eq('campaign_id', campaign.id)
    .eq('npc_key', npcKey)

  if (!npcStages || npcStages.length === 0) return null

  const npcName = (npcStages[0] as Record<string, unknown>).npc_name as string

  // Get completed stages for this character
  const { data: completedStages } = await sb
    .from('campaign_stage_progress')
    .select('chapter_number, stage_number, difficulty, completed_at')
    .eq('character_id', characterId)
    .eq('campaign_id', campaign.id)

  const completed = completedStages ?? []
  const encounters: NpcKeyHistory['encounters'] = []

  for (const ns of npcStages as Array<Record<string, unknown>>) {
    const match = (completed as Array<Record<string, unknown>>).find(
      (c) =>
        c.chapter_number === ns.chapter_number &&
        c.stage_number === ns.stage_number &&
        c.difficulty === ns.difficulty
    )
    if (match) {
      encounters.push({
        chapterNumber: match.chapter_number as number,
        stageNumber: match.stage_number as number,
        difficulty: match.difficulty as 'normal' | 'hard',
        completedAt: match.completed_at as string,
      })
    }
  }

  return { npcKey, npcName, encounters }
}

// ---------------------------------------------------------------------------
// Check if campaign is unlocked
// ---------------------------------------------------------------------------

export async function isCampaignUnlocked(
  characterId: string,
  campaignSlug: string
): Promise<boolean> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns')
    .select('id, unlock_requires_campaign_slug, min_level')
    .eq('slug', campaignSlug)
    .single()
  if (!campaign) return false

  // Check prerequisite campaign completion
  if (campaign.unlock_requires_campaign_slug) {
    const { data: reqCampaign } = await sb
      .from('campaigns').select('id')
      .eq('slug', campaign.unlock_requires_campaign_slug).single()
    if (!reqCampaign) return false

    const { data: progress } = await sb
      .from('campaign_progress')
      .select('completed')
      .eq('character_id', characterId)
      .eq('campaign_id', reqCampaign.id)
      .maybeSingle()
    if (!progress || !progress.completed) return false
  }

  // Check min level
  if ((campaign.min_level as number) > 1) {
    const { data: character } = await supabase
      .from('characters').select('level')
      .eq('id', characterId).single()
    if (!character || character.level < (campaign.min_level as number)) return false
  }

  return true
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapStage(r: Record<string, unknown>): CampaignStage {
  const rewards = (r.rewards ?? { xp: 0, libras: 0 }) as Record<string, unknown>
  return {
    id: r.id as string,
    campaignId: r.campaign_id as string,
    chapterNumber: r.chapter_number as number,
    stageNumber: r.stage_number as number,
    difficulty: r.difficulty as 'normal' | 'hard',
    title: r.title as string,
    narrativeText: r.narrative_text as string,
    npcKey: (r.npc_key as string | null) ?? null,
    npcName: r.npc_name as string,
    npcChallengePhrase: r.npc_challenge_phrase as string,
    npcSnapshotOverride: r.npc_snapshot_override
      ? (r.npc_snapshot_override as NpcStageAttrs)
      : null,
    rewards: {
      xp: (rewards.xp as number) ?? 0,
      libras: (rewards.libras as number) ?? 0,
      lore_fragment_key: (rewards.lore_fragment_key as string | null) ?? null,
    },
  }
}

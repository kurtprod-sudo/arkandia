// ---------------------------------------------------------------------------
// Sistema de Campanha — Fase 36
// Referência: GDD_Sistemas §10
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'
import { startCombat } from './combat'
import type { CampaignChapter, CampaignProgress, CampaignChoiceOption } from '@/types'

// Workaround: tables not yet in generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SBU = { from: (t: string) => any }

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function getCampaignChapters(campaignSlug: string): Promise<CampaignChapter[]> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return []

  const { data } = await sb
    .from('campaign_chapters')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('chapter_number', { ascending: true })

  return (data ?? []).map((r: Record<string, unknown>) => mapChapter(r))
}

export async function getCampaignProgress(
  characterId: string,
  campaignSlug: string
): Promise<CampaignProgress | null> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return null

  const { data } = await sb
    .from('campaign_progress')
    .select('*')
    .eq('character_id', characterId)
    .eq('campaign_id', campaign.id)
    .maybeSingle()

  if (!data) return null
  return mapProgress(data as Record<string, unknown>)
}

export async function getCurrentChapter(
  characterId: string,
  campaignSlug: string
): Promise<CampaignChapter | null> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return null

  const { data: progress } = await sb
    .from('campaign_progress')
    .select('current_chapter')
    .eq('character_id', characterId)
    .eq('campaign_id', campaign.id)
    .maybeSingle()

  const chapterNum = progress?.current_chapter ?? 1

  const { data: chapter } = await sb
    .from('campaign_chapters')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('chapter_number', chapterNum)
    .single()

  return chapter ? mapChapter(chapter as Record<string, unknown>) : null
}

// ---------------------------------------------------------------------------
// Iniciar campanha (idempotente)
// ---------------------------------------------------------------------------

export async function startCampaign(
  characterId: string,
  campaignSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).eq('is_active', true).single()
  if (!campaign) return { success: false, error: 'Campanha não encontrada.' }

  const { data: existing } = await sb
    .from('campaign_progress')
    .select('id')
    .eq('character_id', characterId)
    .eq('campaign_id', campaign.id)
    .maybeSingle()

  if (existing) return { success: true } // already started

  await sb.from('campaign_progress').insert({
    character_id: characterId,
    campaign_id: campaign.id,
    current_chapter: 1,
    chapter_choices: {},
    completed: false,
  })

  return { success: true }
}

// ---------------------------------------------------------------------------
// Escolha narrativa
// ---------------------------------------------------------------------------

export async function makeChapterChoice(
  characterId: string,
  campaignSlug: string,
  choiceIndex: number
): Promise<{ success: boolean; error?: string; narrativeResult?: string }> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return { success: false, error: 'Campanha não encontrada.' }

  const { data: progress } = await sb
    .from('campaign_progress').select('*')
    .eq('character_id', characterId).eq('campaign_id', campaign.id).maybeSingle()
  if (!progress) return { success: false, error: 'Campanha não iniciada.' }
  if (progress.completed) return { success: false, error: 'Campanha já concluída.' }

  const chapterNum = progress.current_chapter as number
  const { data: chapter } = await sb
    .from('campaign_chapters').select('*')
    .eq('campaign_id', campaign.id).eq('chapter_number', chapterNum).single()
  if (!chapter) return { success: false, error: 'Capítulo não encontrado.' }

  const choices = chapter.choices as CampaignChoiceOption[] | null
  if (!choices || choiceIndex < 0 || choiceIndex >= choices.length) {
    return { success: false, error: 'Escolha inválida.' }
  }

  // Check if choice already made for this chapter
  const existingChoices = (progress.chapter_choices ?? {}) as Record<string, number>
  if (existingChoices[String(chapterNum)] !== undefined) {
    return { success: false, error: 'Escolha já realizada neste capítulo.' }
  }

  const chosen = choices[choiceIndex]

  // Save choice
  existingChoices[String(chapterNum)] = choiceIndex
  await sb.from('campaign_progress').update({
    chapter_choices: existingChoices,
    updated_at: new Date().toISOString(),
  }).eq('character_id', characterId).eq('campaign_id', campaign.id)

  // Apply reputation
  if (chosen.reputation_faction && chosen.reputation_delta) {
    const { updateReputation } = await import('./reputation')
    await updateReputation(characterId, chosen.reputation_faction, chosen.reputation_delta).catch(() => {})
  }

  return { success: true, narrativeResult: chosen.narrative_result }
}

// ---------------------------------------------------------------------------
// Combate de capítulo
// ---------------------------------------------------------------------------

export async function startChapterCombat(
  characterId: string,
  campaignSlug: string,
  userId: string
): Promise<{ success: boolean; error?: string; sessionId?: string }> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id').eq('slug', campaignSlug).single()
  if (!campaign) return { success: false, error: 'Campanha não encontrada.' }

  const { data: progress } = await sb
    .from('campaign_progress').select('*')
    .eq('character_id', characterId).eq('campaign_id', campaign.id).maybeSingle()
  if (!progress) return { success: false, error: 'Campanha não iniciada.' }
  if (progress.completed) return { success: false, error: 'Campanha já concluída.' }

  // If already has a session, return it (idempotent)
  if (progress.combat_session_id) {
    return { success: true, sessionId: progress.combat_session_id as string }
  }

  const chapterNum = progress.current_chapter as number
  const { data: chapter } = await sb
    .from('campaign_chapters').select('*')
    .eq('campaign_id', campaign.id).eq('chapter_number', chapterNum).single()
  if (!chapter) return { success: false, error: 'Capítulo não encontrado.' }
  if (!chapter.has_combat) return { success: false, error: 'Este capítulo não tem combate.' }

  // Get player attrs
  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('ataque, magia, defesa, vitalidade, velocidade, precisao, tenacidade, capitania, eter_max')
    .eq('character_id', characterId).single()
  if (!attrs) return { success: false, error: 'Atributos não encontrados.' }

  const statPct = (chapter.npc_stat_pct as number) || 0.8
  const npcAttrs: Record<string, number> = {}
  for (const [key, val] of Object.entries(attrs)) {
    npcAttrs[key] = Math.max(1, Math.floor((val as number) * statPct))
  }
  npcAttrs.hp_max = 80 + npcAttrs.vitalidade * 5
  npcAttrs.hp_atual = npcAttrs.hp_max
  npcAttrs.eter_atual = npcAttrs.eter_max

  // Create phantom NPC character
  const npcName = (chapter.npc_name as string) || 'Inimigo da Campanha'
  const { data: npcChar } = await supabase
    .from('characters')
    .insert({
      user_id: userId,
      name: npcName,
      level: 1,
      status: 'active',
      xp: 0,
      xp_to_next_level: 9999,
    } as never)
    .select('id').single()

  if (!npcChar) return { success: false, error: 'Erro ao criar NPC.' }

  await supabase.from('character_attributes').upsert({
    character_id: npcChar.id,
    ataque: npcAttrs.ataque ?? 10,
    magia: npcAttrs.magia ?? 10,
    defesa: npcAttrs.defesa ?? 5,
    vitalidade: npcAttrs.vitalidade ?? 10,
    velocidade: npcAttrs.velocidade ?? 10,
    precisao: npcAttrs.precisao ?? 10,
    tenacidade: npcAttrs.tenacidade ?? 10,
    capitania: npcAttrs.capitania ?? 0,
    eter_max: npcAttrs.eter_max ?? 50,
    eter_atual: npcAttrs.eter_atual ?? 50,
    hp_max: npcAttrs.hp_max ?? 130,
    hp_atual: npcAttrs.hp_atual ?? 130,
    moral: 100,
    attribute_points: 0,
  } as never, { onConflict: 'character_id' })

  const combatResult = await startCombat(characterId, npcChar.id, 'duelo_livre', userId)

  if (!combatResult.success || !combatResult.sessionId) {
    await supabase.from('character_attributes').delete().eq('character_id', npcChar.id)
    await supabase.from('characters').delete().eq('id', npcChar.id)
    return { success: false, error: combatResult.error ?? 'Erro ao iniciar combate.' }
  }

  // Link session to progress
  await sb.from('campaign_progress').update({
    combat_session_id: combatResult.sessionId,
    updated_at: new Date().toISOString(),
  }).eq('character_id', characterId).eq('campaign_id', campaign.id)

  return { success: true, sessionId: combatResult.sessionId }
}

// ---------------------------------------------------------------------------
// Completar capítulo (chamado após combate ou após escolha/narrativa pura)
// ---------------------------------------------------------------------------

export async function completeChapter(
  characterId: string,
  campaignSlug: string
): Promise<{ success: boolean; error?: string; nextChapter?: number; campaignCompleted?: boolean }> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: campaign } = await sb
    .from('campaigns').select('id, total_chapters').eq('slug', campaignSlug).single()
  if (!campaign) return { success: false, error: 'Campanha não encontrada.' }

  const { data: progress } = await sb
    .from('campaign_progress').select('*')
    .eq('character_id', characterId).eq('campaign_id', campaign.id).maybeSingle()
  if (!progress) return { success: false, error: 'Campanha não iniciada.' }
  if (progress.completed) return { success: false, error: 'Campanha já concluída.' }

  const chapterNum = progress.current_chapter as number
  const { data: chapter } = await sb
    .from('campaign_chapters').select('*')
    .eq('campaign_id', campaign.id).eq('chapter_number', chapterNum).single()
  if (!chapter) return { success: false, error: 'Capítulo não encontrado.' }

  // If chapter has choices, check if choice was made
  const choices = chapter.choices as CampaignChoiceOption[] | null
  const existingChoices = (progress.chapter_choices ?? {}) as Record<string, number>
  if (choices && choices.length > 0 && existingChoices[String(chapterNum)] === undefined) {
    return { success: false, error: 'Faça sua escolha antes de avançar.' }
  }

  // If chapter has combat, check if combat session is resolved
  if (chapter.has_combat) {
    if (!progress.combat_session_id) {
      return { success: false, error: 'Complete o combate antes de avançar.' }
    }
    const { data: session } = await supabase
      .from('combat_sessions').select('status, winner_id')
      .eq('id', progress.combat_session_id).single()
    if (!session || session.status !== 'finished') {
      return { success: false, error: 'Combate ainda em andamento.' }
    }
    if (session.winner_id !== characterId) {
      // Reset combat session so player can retry
      await sb.from('campaign_progress').update({
        combat_session_id: null,
        updated_at: new Date().toISOString(),
      }).eq('character_id', characterId).eq('campaign_id', campaign.id)
      return { success: false, error: 'Você foi derrotado. Tente novamente.' }
    }
  }

  // Grant rewards
  if ((chapter.xp_reward as number) > 0) {
    const { grantXp } = await import('./levelup')
    await grantXp(characterId, chapter.xp_reward as number).catch(() => {})
  }
  if ((chapter.libras_reward as number) > 0) {
    const { data: wallet } = await supabase
      .from('character_wallet').select('libras').eq('character_id', characterId).single()
    if (wallet) {
      await supabase.from('character_wallet').update({
        libras: wallet.libras + (chapter.libras_reward as number),
      } as never).eq('character_id', characterId)
    }
  }
  if (chapter.title_reward_id) {
    const { grantTitle } = await import('./titles')
    await grantTitle(characterId, chapter.title_reward_id as string, 'system').catch(() => {})
  }

  // Resonance unlock (Chapter 5)
  if (chapter.unlocks_resonance) {
    const { data: char } = await supabase
      .from('characters').select('archetype, is_resonance_unlocked')
      .eq('id', characterId).single()
    if (char && !char.is_resonance_unlocked && char.archetype) {
      const { unlockResonance } = await import('./resonance')
      await unlockResonance(characterId, char.archetype).catch(() => {})
    }
  }

  // Advance or complete
  const isLastChapter = chapterNum >= (campaign.total_chapters as number)

  if (isLastChapter) {
    await sb.from('campaign_progress').update({
      completed: true,
      combat_session_id: null,
      updated_at: new Date().toISOString(),
    }).eq('character_id', characterId).eq('campaign_id', campaign.id)

    await createNotification({
      characterId,
      type: 'general',
      title: 'Campanha Concluída!',
      body: 'Você completou a Campanha Inicial. Sua lenda em Ellia está apenas começando.',
      actionUrl: '/campaign',
    })

    // Hook chain
    const { checkAchievements } = await import('./achievements')
    await checkAchievements(characterId, 'expedition_complete', { campaignSlug }).catch(() => {})
    const { updateWeeklyProgress } = await import('./weekly')
    await updateWeeklyProgress(characterId, 'complete_expeditions').catch(() => {})

    return { success: true, campaignCompleted: true }
  }

  const nextChapter = chapterNum + 1
  await sb.from('campaign_progress').update({
    current_chapter: nextChapter,
    combat_session_id: null,
    updated_at: new Date().toISOString(),
  }).eq('character_id', characterId).eq('campaign_id', campaign.id)

  await createNotification({
    characterId,
    type: 'general',
    title: `Capítulo ${chapterNum} concluído`,
    body: `Avance para o Capítulo ${nextChapter}: ${chapter.title}.`,
    actionUrl: '/campaign',
  })

  // Hook chain
  const { checkAchievements } = await import('./achievements')
  await checkAchievements(characterId, 'expedition_complete', { chapter: chapterNum }).catch(() => {})
  const { updateWeeklyProgress } = await import('./weekly')
  await updateWeeklyProgress(characterId, 'complete_expeditions').catch(() => {})
  const { updateSocietyMissionProgress } = await import('./society_missions')
  await updateSocietyMissionProgress(characterId, 'collective_expeditions').catch(() => {})

  return { success: true, nextChapter }
}

// ---------------------------------------------------------------------------
// Resolver combate de campanha (chamado pelo combat.ts quando sessão finaliza)
// ---------------------------------------------------------------------------

export async function resolveCampaignCombat(
  sessionId: string,
  winnerId: string
): Promise<void> {
  const supabase = await createClient()
  const sb = supabase as unknown as SBU

  const { data: progress } = await sb
    .from('campaign_progress').select('character_id, campaign_id')
    .eq('combat_session_id', sessionId).maybeSingle()

  if (!progress) return

  const characterId = progress.character_id as string

  if (winnerId === characterId) {
    await createNotification({
      characterId,
      type: 'general',
      title: 'Combate de Campanha — Vitória!',
      body: 'Você venceu o combate! Avance para completar o capítulo.',
      actionUrl: '/campaign',
    })
  } else {
    // Reset combat session so player can retry
    await sb.from('campaign_progress').update({
      combat_session_id: null,
      updated_at: new Date().toISOString(),
    }).eq('character_id', characterId).eq('campaign_id', progress.campaign_id)

    await createNotification({
      characterId,
      type: 'general',
      title: 'Combate de Campanha — Derrota',
      body: 'Você foi derrotado. Prepare-se e tente novamente.',
      actionUrl: '/campaign',
    })
  }
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapChapter(r: Record<string, unknown>): CampaignChapter {
  return {
    id: r.id as string,
    campaignId: r.campaign_id as string,
    chapterNumber: r.chapter_number as number,
    title: r.title as string,
    narrativeText: r.narrative_text as string,
    hasCombat: r.has_combat as boolean,
    npcName: r.npc_name as string | null,
    npcStatPct: r.npc_stat_pct as number,
    choices: r.choices as CampaignChoiceOption[] | null,
    xpReward: r.xp_reward as number,
    librasReward: r.libras_reward as number,
    titleRewardId: r.title_reward_id as string | null,
    unlocksResonance: r.unlocks_resonance as boolean,
  }
}

function mapProgress(r: Record<string, unknown>): CampaignProgress {
  return {
    id: r.id as string,
    characterId: r.character_id as string,
    campaignId: r.campaign_id as string,
    currentChapter: r.current_chapter as number,
    chapterChoices: r.chapter_choices as Record<string, number>,
    combatSessionId: r.combat_session_id as string | null,
    completed: r.completed as boolean,
  }
}

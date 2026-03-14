import { createClient } from '@/lib/supabase/server'

export type RankingCategory =
  | 'maiores_guerreiros'
  | 'sociedades_dominantes'
  | 'exploradores'
  | 'primeiros_maestria'
  | 'herois_guerra'

/**
 * Atualiza todos os rankings a partir dos dados reais.
 * Chamado pelo cron diário.
 * Referência: GDD_Sistemas §6.4
 */
export async function updateAllRankings(): Promise<{ success: boolean; error?: string }> {
  try {
    await Promise.all([
      updateMaioresGuerreiros(),
      updateSociedadesDominantes(),
      updateExploradores(),
      updateHeroisDeGuerra(),
    ])
    return { success: true }
  } catch (err) {
    console.error('[rankings] updateAllRankings error:', err)
    return { success: false, error: 'Erro ao atualizar rankings.' }
  }
}

/**
 * Ranking: Maiores Guerreiros — vitórias em PvP ranqueado.
 */
async function updateMaioresGuerreiros() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('actor_id, metadata')
    .eq('type', 'combat_finished')
    .order('created_at', { ascending: false })
    .limit(10000)

  const winsMap: Record<string, { wins: number; name: string }> = {}

  for (const event of events ?? []) {
    const meta = event.metadata as Record<string, unknown>
    if (meta?.modality !== 'duelo_ranqueado') continue
    if (!event.actor_id) continue

    if (!winsMap[event.actor_id]) {
      winsMap[event.actor_id] = { wins: 0, name: '' }
    }
    winsMap[event.actor_id].wins++
  }

  const characterIds = Object.keys(winsMap)
  if (characterIds.length > 0) {
    const { data: characters } = await supabase
      .from('characters')
      .select('id, name')
      .in('id', characterIds)
    for (const char of characters ?? []) {
      if (winsMap[char.id]) winsMap[char.id].name = char.name
    }
  }

  await upsertRankings(
    supabase,
    'maiores_guerreiros',
    'character',
    Object.entries(winsMap).map(([id, data]) => ({
      entity_id: id,
      entity_name: data.name,
      score: data.wins,
      metadata: { wins: data.wins },
    }))
  )
}

/**
 * Ranking: Sociedades Dominantes — territórios controlados.
 */
async function updateSociedadesDominantes() {
  const supabase = await createClient()

  const { data: territories } = await supabase
    .from('territories')
    .select('controlling_society_id, societies(name)')
    .not('controlling_society_id', 'is', null)

  const societyMap: Record<string, { count: number; name: string }> = {}

  for (const t of territories ?? []) {
    if (!t.controlling_society_id) continue
    const name = (t.societies as Record<string, unknown> | null)?.name as string ?? ''
    if (!societyMap[t.controlling_society_id]) {
      societyMap[t.controlling_society_id] = { count: 0, name }
    }
    societyMap[t.controlling_society_id].count++
  }

  await upsertRankings(
    supabase,
    'sociedades_dominantes',
    'society',
    Object.entries(societyMap).map(([id, data]) => ({
      entity_id: id,
      entity_name: data.name,
      score: data.count,
      metadata: { territories: data.count },
    }))
  )
}

/**
 * Ranking: Exploradores — expedições completadas.
 */
async function updateExploradores() {
  const supabase = await createClient()

  const { data: expeditions } = await supabase
    .from('expeditions')
    .select('character_id, characters(name)')
    .eq('status', 'completed')

  const explorerMap: Record<string, { count: number; name: string }> = {}

  for (const exp of expeditions ?? []) {
    if (!exp.character_id) continue
    const name = (exp.characters as Record<string, unknown> | null)?.name as string ?? ''
    if (!explorerMap[exp.character_id]) {
      explorerMap[exp.character_id] = { count: 0, name }
    }
    explorerMap[exp.character_id].count++
  }

  await upsertRankings(
    supabase,
    'exploradores',
    'character',
    Object.entries(explorerMap).map(([id, data]) => ({
      entity_id: id,
      entity_name: data.name,
      score: data.count,
      metadata: { expeditions: data.count },
    }))
  )
}

/**
 * Ranking: Heróis de Guerra — participação em guerras de território.
 */
async function updateHeroisDeGuerra() {
  const supabase = await createClient()

  const { data: participants } = await supabase
    .from('war_participants')
    .select('character_id, characters(name), war_declarations(status)')

  const heroMap: Record<string, { count: number; name: string }> = {}

  for (const p of participants ?? []) {
    const war = p.war_declarations as Record<string, unknown> | null
    if (war?.status !== 'finished') continue
    if (!p.character_id) continue
    const name = (p.characters as Record<string, unknown> | null)?.name as string ?? ''
    if (!heroMap[p.character_id]) {
      heroMap[p.character_id] = { count: 0, name }
    }
    heroMap[p.character_id].count++
  }

  await upsertRankings(
    supabase,
    'herois_guerra',
    'character',
    Object.entries(heroMap).map(([id, data]) => ({
      entity_id: id,
      entity_name: data.name,
      score: data.count,
      metadata: { wars: data.count },
    }))
  )
}

/**
 * Helper: upsert de entradas de ranking com posição calculada.
 */
async function upsertRankings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  category: RankingCategory,
  entityType: 'character' | 'society',
  entries: Array<{
    entity_id: string
    entity_name: string
    score: number
    metadata: Record<string, unknown>
  }>
) {
  const sorted = [...entries].sort((a, b) => b.score - a.score)
  const now = new Date().toISOString()

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]
    await supabase
      .from('rankings')
      .upsert({
        category,
        entity_id: entry.entity_id,
        entity_type: entityType,
        entity_name: entry.entity_name,
        score: entry.score,
        rank_position: i + 1,
        metadata: entry.metadata as unknown as Record<string, never>,
        updated_at: now,
      }, { onConflict: 'category,entity_id' })
  }
}

/**
 * Retorna top 20 de uma categoria de ranking.
 */
export async function getRanking(category: RankingCategory, limit = 20) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rankings')
    .select('*')
    .eq('category', category)
    .order('rank_position', { ascending: true })
    .limit(limit)
  return data ?? []
}

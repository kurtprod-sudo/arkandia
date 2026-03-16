// ---------------------------------------------------------------------------
// Encerramento de Temporada — Fase 33
// Referência: GDD_Sistemas §6.14
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { grantTitle } from './titles'
import { createNotification } from './notifications'

const RANKED_CATEGORIES = ['maiores_guerreiros', 'exploradores', 'herois_guerra']
const CATEGORY_LABELS: Record<string, string> = {
  maiores_guerreiros: 'Guerreiro',
  exploradores: 'Explorador',
  herois_guerra: 'Herói de Guerra',
}
const ALL_CATEGORIES = ['maiores_guerreiros', 'sociedades_dominantes', 'exploradores', 'primeiros_maestria', 'herois_guerra']

export async function closeSeason(
  gmCharacterId: string,
  newSeasonName: string,
  newSeasonTheme: string,
  newSeasonLoreText?: string
): Promise<{ success: boolean; error?: string; newSeasonId?: string; titlesGranted?: number }> {
  const supabase = await createClient()

  // 1. Find active season
  const { data: season } = await supabase.from('seasons').select('id, theme').eq('is_active', true).maybeSingle()
  if (!season) return { success: false, error: 'Nenhuma temporada ativa.' }

  let titlesGranted = 0

  // 2. Snapshot rankings
  for (const cat of ALL_CATEGORIES) {
    const { data: entries } = await supabase.from('rankings')
      .select('*').eq('category', cat).order('rank_position')
    for (const entry of entries ?? []) {
      await (supabase as unknown as { from: (t: string) => { insert: (d: Record<string, unknown>) => Promise<unknown> } })
        .from('season_ranking_snapshots').insert({
          season_id: season.id,
          category: cat,
          entity_id: entry.entity_id,
          entity_type: entry.entity_type,
          entity_name: entry.entity_name,
          score: entry.score,
          rank_position: entry.rank_position,
          metadata: entry.metadata,
        })
    }
  }

  // 3. Distribute seasonal titles (top 3 of ranked categories)
  for (const cat of RANKED_CATEGORIES) {
    const label = CATEGORY_LABELS[cat] ?? cat
    const { data: top3 } = await supabase.from('rankings')
      .select('entity_id, entity_type, entity_name, rank_position')
      .eq('category', cat).order('rank_position').limit(3)

    for (const entry of top3 ?? []) {
      if (entry.entity_type !== 'character') continue

      const titleName = `Campeão da ${season.theme ?? 'Temporada'} — ${label}`

      // Create title definition (idempotent)
      await supabase.from('title_definitions').insert({
        name: titleName,
        description: `Top ${entry.rank_position} em ${label} na temporada ${season.theme ?? ''}.`,
        category: 'especial',
        trigger_type: 'automatico',
        trigger_condition: {},
        is_unique: false,
      } as never)

      const { data: titleDef } = await supabase.from('title_definitions')
        .select('id').eq('name', titleName).maybeSingle()
      if (titleDef) {
        await grantTitle(entry.entity_id, titleDef.id, 'system').catch(() => {})
        titlesGranted++
      }

      await createNotification({
        characterId: entry.entity_id,
        type: 'general',
        title: `Título Sazonal: ${titleName}`,
        body: `Você conquistou o ${entry.rank_position}º lugar em ${label} nesta temporada.`,
        actionUrl: '/battle-pass',
      })
    }
  }

  // 4. Reset rankings
  for (const cat of ALL_CATEGORIES) {
    await supabase.from('rankings').delete().eq('category', cat)
  }

  // 5. End current season
  await supabase.from('seasons').update({ is_active: false } as never).eq('id', season.id)

  // 6. Create new season
  const { data: newSeason } = await supabase.from('seasons').insert({
    name: newSeasonName,
    theme: newSeasonTheme,
    lore_text: newSeasonLoreText ?? null,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    is_active: true,
  } as never).select('id').single()

  return { success: true, newSeasonId: newSeason?.id, titlesGranted }
}

export async function getSeasonHistory(limit = 10, offset = 0): Promise<Array<{
  season: { id: string; name: string; theme: string; endsAt: string }
  snapshots: Array<{ category: string; rankPosition: number; entityName: string; score: number }>
}>> {
  const supabase = await createClient()

  const { data: seasons } = await supabase.from('seasons')
    .select('id, name, theme, ends_at')
    .eq('is_active', false)
    .order('ends_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!seasons) return []

  const results = []
  for (const s of seasons) {
    const { data: snaps } = await (supabase as unknown as { from: (t: string) => { select: (sel: string) => { eq: (k: string, v: string) => { order: (k: string) => { limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }> } } } } })
      .from('season_ranking_snapshots').select('category, rank_position, entity_name, score')
      .eq('season_id', s.id).order('rank_position').limit(15)

    results.push({
      season: { id: s.id, name: s.name, theme: s.theme ?? '', endsAt: s.ends_at ?? '' },
      snapshots: (snaps ?? []).map((sn) => ({
        category: sn.category as string,
        rankPosition: sn.rank_position as number,
        entityName: sn.entity_name as string,
        score: sn.score as number,
      })),
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Bestiário — Fase 31
// Referência: GDD_Sistemas §6.12
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { grantTitle } from './titles'

export interface BestiaryEntry {
  npcTypeId: string; npcName: string; npcTier: string
  zoneName: string; zoneId: string; totalDefeated: number
  firstDefeatedAt: string; loreText: string | null
  firstDiscovererName: string | null; knownDrops: string[]
}

export interface ZoneBestiaryProgress {
  zoneId: string; zoneName: string
  discovered: number; total: number; completed: boolean
}

const ZONE_TITLE_MAP: Record<string, string> = {
  'Ruínas de Thar-Halum': 'Sobrevivente de Thar-Halum',
  'Floresta de Eryuell': 'Fantasma de Eryuell',
  'Minas de Düren': 'Forjador das Profundezas',
  'Bordas de Urgath': 'Algoz de Urgath',
  'Câmara do Arquétipo Corrompido': 'Primeiro do Eco',
}

export async function recordNpcDefeat(
  characterId: string,
  npcTypeId: string
): Promise<void> {
  try {
    const supabase = await createClient()

    // Upsert bestiary entry
    const { data: existing } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> } } } } })
      .from('character_bestiary').select('id, total_defeated')
      .eq('character_id', characterId).eq('npc_type_id', npcTypeId).maybeSingle()

    if (existing) {
      await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } })
        .from('character_bestiary')
        .update({ total_defeated: (existing.total_defeated as number) + 1 })
        .eq('id', existing.id as string)
    } else {
      await (supabase as unknown as { from: (t: string) => { insert: (d: Record<string, unknown>) => Promise<unknown> } })
        .from('character_bestiary')
        .insert({ character_id: characterId, npc_type_id: npcTypeId, total_defeated: 1 })

      // First time defeating this NPC — generate lore if not exists
      const { generateNpcLore } = await import('@/lib/narrative/bestiary')
      await generateNpcLore(npcTypeId, characterId).catch(() => {})
    }

    // Check zone completion
    const { data: npc } = await supabase
      .from('npc_types').select('zone_id, hunting_zones(name)').eq('id', npcTypeId).single()
    if (!npc) return

    const zoneId = npc.zone_id
    const zoneName = ((npc.hunting_zones as Record<string, unknown>)?.name as string) ?? ''

    const { data: zoneNpcs } = await supabase
      .from('npc_types').select('id').eq('zone_id', zoneId)
    const totalInZone = zoneNpcs?.length ?? 0

    const { data: defeated } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { in: (k: string, v: string[]) => Promise<{ data: Array<Record<string, unknown>> | null }> } } } })
      .from('character_bestiary').select('npc_type_id')
      .eq('character_id', characterId)
      .in('npc_type_id', (zoneNpcs ?? []).map((n) => n.id))

    if ((defeated?.length ?? 0) >= totalInZone && totalInZone > 0) {
      const titleName = ZONE_TITLE_MAP[zoneName]
      if (titleName) {
        const { data: titleDef } = await supabase
          .from('title_definitions').select('id').eq('name', titleName).maybeSingle()
        if (titleDef) await grantTitle(characterId, titleDef.id, 'system').catch(() => {})
      }
    }
  } catch {
    // Never throw
  }
}

export async function getCharacterBestiary(characterId: string): Promise<BestiaryEntry[]> {
  const supabase = await createClient()

  const { data: entries } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string) => Promise<{ data: Array<Record<string, unknown>> | null }> } } } })
    .from('character_bestiary')
    .select('npc_type_id, total_defeated, first_defeated_at, npc_types(id, name, tier, loot_table, zone_id, hunting_zones(name))')
    .eq('character_id', characterId)
    .order('first_defeated_at')

  if (!entries) return []

  const npcTypeIds = entries.map((e) => (e.npc_types as Record<string, unknown>)?.id as string).filter(Boolean)

  // Fetch lore for all
  const { data: loreEntries } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: Array<Record<string, unknown>> | null }> } } })
    .from('npc_lore').select('npc_type_id, lore_text, first_discoverer_id, characters(name)')
    .in('npc_type_id', npcTypeIds.length > 0 ? npcTypeIds : ['__none__'])

  const loreMap = new Map<string, { loreText: string; discovererName: string | null }>()
  for (const l of loreEntries ?? []) {
    loreMap.set(l.npc_type_id as string, {
      loreText: l.lore_text as string,
      discovererName: ((l.characters as Record<string, unknown>)?.name as string) ?? null,
    })
  }

  return entries.map((e) => {
    const npc = e.npc_types as Record<string, unknown>
    const zone = (npc?.hunting_zones as Record<string, unknown>) ?? {}
    const lootTable = (npc?.loot_table as Array<Record<string, unknown>>) ?? []
    const drops = lootTable.filter((l) => l.type === 'item').map((l) => (l.item_name as string) ?? '')
    const lore = loreMap.get(e.npc_type_id as string)

    return {
      npcTypeId: e.npc_type_id as string,
      npcName: (npc?.name as string) ?? '?',
      npcTier: (npc?.tier as string) ?? 'fraco',
      zoneName: (zone.name as string) ?? '?',
      zoneId: (npc?.zone_id as string) ?? '',
      totalDefeated: e.total_defeated as number,
      firstDefeatedAt: e.first_defeated_at as string,
      loreText: lore?.loreText ?? null,
      firstDiscovererName: lore?.discovererName ?? null,
      knownDrops: drops.filter(Boolean),
    }
  })
}

export async function getZoneBestiaryProgress(characterId: string): Promise<ZoneBestiaryProgress[]> {
  const supabase = await createClient()

  const { data: zones } = await supabase
    .from('hunting_zones').select('id, name').eq('is_active', true)

  if (!zones) return []

  const results: ZoneBestiaryProgress[] = []

  for (const zone of zones) {
    const { data: zoneNpcs } = await supabase
      .from('npc_types').select('id').eq('zone_id', zone.id)
    const total = zoneNpcs?.length ?? 0

    const npcIds = (zoneNpcs ?? []).map((n) => n.id)
    let discovered = 0

    if (npcIds.length > 0) {
      const { count } = await (supabase as unknown as { from: (t: string) => { select: (s: string, o: Record<string, string | boolean>) => { eq: (k: string, v: string) => { in: (k: string, v: string[]) => Promise<{ count: number | null }> } } } })
        .from('character_bestiary').select('id', { count: 'exact', head: true })
        .eq('character_id', characterId).in('npc_type_id', npcIds)
      discovered = count ?? 0
    }

    results.push({
      zoneId: zone.id,
      zoneName: zone.name,
      discovered,
      total,
      completed: discovered >= total && total > 0,
    })
  }

  return results
}

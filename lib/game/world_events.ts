// ---------------------------------------------------------------------------
// Eventos de Mundo — Fase 27
// Referência: GDD_Sistemas §6.5
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'
import { createEvent } from './events'

export type WorldEventType =
  | 'monolito' | 'invasao_faccao' | 'passagem_imperador'
  | 'torneio' | 'crise_politica' | 'catalogo_lendario'

export interface WorldEvent {
  id: string
  type: WorldEventType
  title: string
  description: string
  status: 'active' | 'ended'
  startsAt: string
  endsAt: string | null
  metadata: Record<string, unknown>
  createdBy: string
  createdAt: string
}

export async function gmCreateWorldEvent(input: {
  gmCharacterId: string
  type: WorldEventType
  title: string
  description: string
  metadata: Record<string, unknown>
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: we, error } = await supabase
    .from('world_events')
    .insert({
      type: input.type,
      title: input.title,
      description: input.description,
      metadata: input.metadata as never,
      created_by: input.gmCharacterId,
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !we) return { success: false, error: 'Erro ao criar evento.' }

  // Side effects by type
  if (input.type === 'invasao_faccao') {
    const meta = input.metadata as { zone_name?: string; zone_slug?: string; zone_min_level?: number }
    if (meta.zone_name && meta.zone_slug) {
      await supabase.from('hunting_zones').insert({
        name: meta.zone_name,
        description: `Zona temporária de evento: ${input.title}`,
        location: 'Evento de Mundo',
        min_level: meta.zone_min_level ?? 1,
        risk_level: 'alto',
        is_active: true,
        cooldown_minutes: 30,
      } as never)
    }
  }

  // Notify all active characters
  const { data: characters } = await supabase
    .from('characters').select('id').neq('status', 'dead')
  for (const ch of characters ?? []) {
    await createNotification({
      characterId: ch.id,
      type: 'general',
      title: `Evento: ${input.title}`,
      body: input.description.slice(0, 200),
      actionUrl: '/events',
    })
  }

  await createEvent(supabase, {
    type: 'general' as string,
    actorId: input.gmCharacterId,
    metadata: { world_event_id: we.id, type: input.type },
    isPublic: true,
    narrativeText: `Evento de Mundo: ${input.title}.`,
  })

  return { success: true, eventId: we.id }
}

export async function gmEndWorldEvent(
  eventId: string,
  gmCharacterId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: we } = await supabase
    .from('world_events').select('*').eq('id', eventId).eq('status', 'active').single()
  if (!we) return { success: false, error: 'Evento não encontrado ou já encerrado.' }

  const type = we.type as WorldEventType
  const metadata = we.metadata as Record<string, unknown>

  // Apply effects by type
  if (type === 'monolito') {
    const factionSlug = metadata.faction_slug as string
    const bonus = (metadata.reputation_bonus as number) ?? 0
    if (factionSlug && bonus) {
      // Find participants via events table
      const { data: participantEvents } = await supabase
        .from('events')
        .select('actor_id')
        .eq('type', 'monolito_participated')
        .gte('created_at', we.starts_at)

      const participantIds = Array.from(new Set((participantEvents ?? []).map((e) => e.actor_id).filter((id): id is string => id !== null)))
      const { data: faction } = await supabase.from('factions').select('id').eq('slug', factionSlug).single()
      if (faction) {
        for (const charId of participantIds) {
          if (!charId) continue
          const { data: rep } = await supabase
            .from('character_reputation')
            .select('points')
            .eq('character_id', charId)
            .eq('faction_id', faction.id)
            .maybeSingle()
          if (rep) {
            await supabase.from('character_reputation')
              .update({ points: rep.points + bonus })
              .eq('character_id', charId).eq('faction_id', faction.id)
          } else {
            await supabase.from('character_reputation')
              .insert({ character_id: charId, faction_id: faction.id, points: bonus, stage: 'neutro' })
          }
        }
      }
    }
  }

  if (type === 'invasao_faccao') {
    // Deactivate the hunting zone (best-effort — zone may not have world_event_id in metadata)
    const zoneName = metadata.zone_name as string
    if (zoneName) {
      await supabase.from('hunting_zones').update({ is_active: false } as never)
        .eq('name', zoneName)
    }
  }

  if (type === 'crise_politica') {
    const deltas = metadata.faction_deltas as Record<string, number> | undefined
    if (deltas) {
      const { data: allChars } = await supabase.from('characters').select('id').neq('status', 'dead')
      for (const [factionSlug, delta] of Object.entries(deltas)) {
        const { data: faction } = await supabase.from('factions').select('id').eq('slug', factionSlug).single()
        if (!faction) continue
        for (const ch of allChars ?? []) {
          const { data: rep } = await supabase
            .from('character_reputation')
            .select('points')
            .eq('character_id', ch.id).eq('faction_id', faction.id).maybeSingle()
          if (rep) {
            await supabase.from('character_reputation')
              .update({ points: rep.points + delta })
              .eq('character_id', ch.id).eq('faction_id', faction.id)
          } else {
            await supabase.from('character_reputation')
              .insert({ character_id: ch.id, faction_id: faction.id, points: delta, stage: 'neutro' })
          }
        }
      }
    }
  }

  // Mark ended
  await supabase.from('world_events').update({
    status: 'ended', ends_at: new Date().toISOString(), ended_by: gmCharacterId,
  }).eq('id', eventId)

  return { success: true }
}

export async function getActiveWorldEvents(): Promise<WorldEvent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('world_events').select('*').eq('status', 'active').order('created_at', { ascending: false })
  return (data ?? []).map(mapEvent)
}

export async function getWorldEventHistory(limit = 20, offset = 0): Promise<WorldEvent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('world_events').select('*').eq('status', 'ended')
    .order('ends_at', { ascending: false }).range(offset, offset + limit - 1)
  return (data ?? []).map(mapEvent)
}

function mapEvent(r: Record<string, unknown>): WorldEvent {
  return {
    id: r.id as string, type: r.type as WorldEventType,
    title: r.title as string, description: r.description as string,
    status: r.status as 'active' | 'ended',
    startsAt: r.starts_at as string, endsAt: r.ends_at as string | null,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    createdBy: r.created_by as string, createdAt: r.created_at as string,
  }
}

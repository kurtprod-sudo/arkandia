import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database, type Json } from '@/types/database.types'
import { type EventType, type GameEvent } from '@/types'

// ---------------------------------------------------------------------------
// Utilitário central: registrar eventos na tabela `events`
// ---------------------------------------------------------------------------

export interface CreateEventParams {
  type: EventType | string
  actorId?: string
  targetId?: string
  metadata?: Record<string, unknown>
  isPublic?: boolean
  narrativeText?: string
}

/** Registra um evento na tabela central. Deve ser chamado após toda ação relevante. */
export async function createEvent(
  supabase: SupabaseClient<Database>,
  params: CreateEventParams
): Promise<GameEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      type: params.type,
      actor_id: params.actorId ?? null,
      target_id: params.targetId ?? null,
      metadata: (params.metadata ?? {}) as Json,
      is_public: params.isPublic ?? false,
      narrative_text: params.narrativeText ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createEvent] Erro ao registrar evento:', error)
    return null
  }

  if (!data) return null

  return {
    ...data,
    metadata: data.metadata as Record<string, unknown>,
  }
}

/** Busca os últimos N eventos (para painel GM ou jornal) */
export async function getRecentEvents(
  supabase: SupabaseClient<Database>,
  limit = 50,
  onlyPublic = false
): Promise<GameEvent[]> {
  let query = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (onlyPublic) {
    query = query.eq('is_public', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getRecentEvents] Erro:', error)
    return []
  }

  return (data ?? []).map((row) => ({
    ...row,
    metadata: row.metadata as Record<string, unknown>,
  }))
}

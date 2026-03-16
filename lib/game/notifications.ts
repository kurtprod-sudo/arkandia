import { createClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'expedition_done'
  | 'duel_received'
  | 'letter_received'
  | 'dungeon_invite'
  | 'society_invite'
  | 'war_declared'
  | 'level_up'
  | 'hunting_done'
  | 'resonance_unlocked'
  | 'general'

export interface CreateNotificationInput {
  characterId: string
  type: NotificationType
  title: string
  body: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('notifications').insert({
    character_id: input.characterId,
    type: input.type as string,
    title: input.title,
    body: input.body,
    action_url: input.actionUrl ?? null,
    metadata: (input.metadata ?? {}) as unknown as Record<string, never>,
  })
}

export async function markNotificationRead(
  notificationId: string,
  characterId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('character_id', characterId)
}

export async function markAllNotificationsRead(
  characterId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('character_id', characterId)
    .eq('is_read', false)
}

export async function getUnreadCount(characterId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('character_id', characterId)
    .eq('is_read', false)
  return count ?? 0
}

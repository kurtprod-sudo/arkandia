// ---------------------------------------------------------------------------
// Sistema de Moderação
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'

export async function banUser(
  targetUserId: string,
  reason: string,
  durationHours: number | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single()
  if (!targetProfile) return { success: false, error: 'Usuário não encontrado.' }
  if (targetProfile.role === 'gm') return { success: false, error: 'Não é possível banir outro GM.' }

  const bannedUntil = durationHours
    ? new Date(Date.now() + durationHours * 3600000).toISOString()
    : null

  await supabase
    .from('profiles')
    .update({ is_banned: true, banned_until: bannedUntil, ban_reason: reason })
    .eq('id', targetUserId)

  await supabase.from('moderation_logs').insert({
    moderator_id: user.id,
    target_user_id: targetUserId,
    action: 'ban',
    reason,
    duration_hours: durationHours,
    expires_at: bannedUntil,
  })

  return { success: true }
}

export async function unbanUser(
  targetUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  await supabase
    .from('profiles')
    .update({ is_banned: false, banned_until: null, ban_reason: null })
    .eq('id', targetUserId)

  await supabase.from('moderation_logs').insert({
    moderator_id: user.id,
    target_user_id: targetUserId,
    action: 'unban',
    reason,
  })

  return { success: true }
}

export async function silenceUser(
  targetUserId: string,
  reason: string,
  durationHours: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const silencedUntil = new Date(Date.now() + durationHours * 3600000).toISOString()

  await supabase
    .from('profiles')
    .update({ is_silenced: true, silenced_until: silencedUntil })
    .eq('id', targetUserId)

  await supabase.from('moderation_logs').insert({
    moderator_id: user.id,
    target_user_id: targetUserId,
    action: 'silence',
    reason,
    duration_hours: durationHours,
    expires_at: silencedUntil,
  })

  return { success: true }
}

export async function unsilenceUser(
  targetUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  await supabase
    .from('profiles')
    .update({ is_silenced: false, silenced_until: null })
    .eq('id', targetUserId)

  await supabase.from('moderation_logs').insert({
    moderator_id: user.id,
    target_user_id: targetUserId,
    action: 'unsilence',
    reason,
  })

  return { success: true }
}

export async function checkBanStatus(
  userId: string
): Promise<{ isBanned: boolean; reason?: string; until?: string }> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_banned, banned_until, ban_reason')
    .eq('id', userId)
    .single()

  if (!profile?.is_banned) return { isBanned: false }

  if (profile.banned_until && new Date(profile.banned_until) < new Date()) {
    await supabase
      .from('profiles')
      .update({ is_banned: false, banned_until: null, ban_reason: null })
      .eq('id', userId)
    return { isBanned: false }
  }

  return {
    isBanned: true,
    reason: profile.ban_reason ?? undefined,
    until: profile.banned_until ?? undefined,
  }
}

export async function checkSilenceStatus(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_silenced, silenced_until')
    .eq('id', userId)
    .single()

  if (!profile?.is_silenced) return false

  if (profile.silenced_until && new Date(profile.silenced_until) < new Date()) {
    await supabase
      .from('profiles')
      .update({ is_silenced: false, silenced_until: null })
      .eq('id', userId)
    return false
  }

  return true
}

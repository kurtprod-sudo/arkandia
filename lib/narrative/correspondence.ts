import { createClient } from '@/lib/supabase/server'
import { createEvent } from '@/lib/game/events'
import { createNotification } from '@/lib/game/notifications'

/**
 * Envia uma carta a outro personagem.
 */
export async function sendLetter(
  senderId: string,
  userId: string,
  recipientId: string,
  subject: string,
  content: string,
  parentId?: string
): Promise<{ success: boolean; error?: string; letterId?: string }> {
  const supabase = await createClient()

  if (!subject.trim()) return { success: false, error: 'Assunto obrigatório.' }
  if (!content.trim()) return { success: false, error: 'Conteúdo obrigatório.' }
  if (subject.length > 120) return { success: false, error: 'Assunto muito longo.' }
  if (content.length > 3000) return { success: false, error: 'Carta muito longa.' }

  // Verifica ownership do remetente
  const { data: sender } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', senderId)
    .eq('user_id', userId)
    .single()
  if (!sender) return { success: false, error: 'Personagem não encontrado.' }

  // Não pode enviar carta para si mesmo
  if (senderId === recipientId) {
    return { success: false, error: 'Você não pode enviar uma carta para si mesmo.' }
  }

  // Verifica que destinatário existe
  const { data: recipient } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', recipientId)
    .single()
  if (!recipient) return { success: false, error: 'Destinatário não encontrado.' }

  const { data: letter, error } = await supabase
    .from('letters')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      subject,
      content,
      parent_id: parentId ?? null,
      is_read: false,
    })
    .select()
    .single()

  if (error || !letter) return { success: false, error: 'Erro ao enviar carta.' }

  await createEvent(supabase, {
    type: 'letter_sent',
    actorId: senderId,
    targetId: recipientId,
    metadata: {
      letter_id: letter.id,
      subject,
      is_reply: !!parentId,
    },
    isPublic: false,
    narrativeText: `${sender.name} enviou uma carta a ${recipient.name}.`,
  })

  await createNotification({
    characterId: recipientId,
    type: 'letter_received',
    title: 'Nova carta',
    body: `${sender.name} enviou uma carta: "${subject}".`,
    actionUrl: '/letters',
    metadata: { letter_id: letter.id },
  })

  // Completa daily task de correspondência para o remetente
  const { completeTask } = await import('@/lib/game/daily')
  await completeTask(senderId, 'send_letter').catch(() => {})

  return { success: true, letterId: letter.id }
}

/**
 * Marca uma carta como lida.
 */
export async function markLetterRead(
  letterId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: letter } = await supabase
    .from('letters')
    .select('recipient_id, is_read')
    .eq('id', letterId)
    .single()
  if (!letter) return { success: false, error: 'Carta não encontrada.' }

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', letter.recipient_id)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  if (letter.is_read) return { success: true }

  await supabase
    .from('letters')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', letterId)

  return { success: true }
}

/**
 * Retorna caixa de entrada de um personagem.
 */
export async function getInbox(characterId: string, limit = 30) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('letters')
    .select('*, sender:characters!sender_id(id, name, avatar_url, title)')
    .eq('recipient_id', characterId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

/**
 * Retorna cartas enviadas por um personagem.
 */
export async function getSentLetters(characterId: string, limit = 30) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('letters')
    .select('*, recipient:characters!recipient_id(id, name, avatar_url, title)')
    .eq('sender_id', characterId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

/**
 * Retorna contagem de cartas não lidas para o dashboard.
 */
export async function getUnreadCount(characterId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('letters')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', characterId)
    .eq('is_read', false)
  return count ?? 0
}

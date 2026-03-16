import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/game/notifications'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })

  const { notification_id, all } = await req.json()

  if (all) {
    await markAllNotificationsRead(character.id)
  } else if (notification_id) {
    await markNotificationRead(notification_id, character.id)
  } else {
    return NextResponse.json({ error: 'notification_id ou all obrigatório.' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

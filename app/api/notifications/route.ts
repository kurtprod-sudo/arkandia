import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })

  const page = Number(req.nextUrl.searchParams.get('page') ?? '1')
  const limit = 30
  const offset = (page - 1) * limit

  const [{ data: notifications }, { count: unreadCount }, { count: totalCount }] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('character_id', character.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('character_id', character.id)
      .eq('is_read', false),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('character_id', character.id),
  ])

  return NextResponse.json({
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    hasMore: (totalCount ?? 0) > offset + limit,
  })
}

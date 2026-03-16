import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processBossAction } from '@/lib/game/world_boss'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { data: ch } = await supabase.from('characters').select('id').eq('user_id', user.id).single()
  if (!ch) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })
  const { boss_id, action } = await req.json()
  if (!boss_id || !action) return NextResponse.json({ error: 'Campos obrigatórios.' }, { status: 400 })
  const result = await processBossAction(boss_id, ch.id, user.id, action)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

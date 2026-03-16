import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBossWithContribution } from '@/lib/game/world_boss'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { data: ch } = await supabase.from('characters').select('id').eq('user_id', user.id).single()
  if (!ch) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })
  const result = await getBossWithContribution(ch.id)
  return NextResponse.json(result)
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })

  await supabase
    .from('characters')
    .update({ resonance_event_pending: false })
    .eq('id', character.id)

  return NextResponse.json({ success: true })
}

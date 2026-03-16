import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { challengeMirror } from '@/lib/game/coliseu'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { defender_character_id } = await req.json()
  if (!defender_character_id) return NextResponse.json({ error: 'defender_character_id obrigatório.' }, { status: 400 })

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })

  const result = await challengeMirror(character.id, user.id, defender_character_id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setActiveTitle } from '@/lib/game/titles'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, title_name } = await req.json()
  if (!character_id) {
    return NextResponse.json({ error: 'character_id obrigatório.' }, { status: 400 })
  }

  const result = await setActiveTitle(character_id, user.id, title_name ?? null)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reworkAvatar } from '@/lib/narrative/avatar'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, physical_traits } = await req.json()
  if (!character_id) {
    return NextResponse.json({ error: 'character_id obrigatório.' }, { status: 400 })
  }

  const result = await reworkAvatar(character_id, user.id, physical_traits ?? '')
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

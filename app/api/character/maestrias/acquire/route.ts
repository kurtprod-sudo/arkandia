import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acquireMaestria } from '@/lib/game/maestrias'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, maestria_id } = await req.json()
  if (!character_id || !maestria_id) {
    return NextResponse.json({ error: 'character_id e maestria_id obrigatórios.' }, { status: 400 })
  }

  const result = await acquireMaestria(character_id, user.id, maestria_id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

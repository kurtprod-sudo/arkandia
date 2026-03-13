import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acquireSkill } from '@/lib/game/skills'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, skill_id } = await req.json()
  if (!character_id || !skill_id) {
    return NextResponse.json({ error: 'character_id e skill_id obrigatórios.' }, { status: 400 })
  }

  const result = await acquireSkill(character_id, skill_id, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

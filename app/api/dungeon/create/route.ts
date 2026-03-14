import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDungeonSession, type DungeonDifficulty } from '@/lib/game/dungeon'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { character_id, dungeon_type_id, difficulty } = await req.json()
  if (!character_id || !dungeon_type_id || !difficulty) {
    return NextResponse.json({ error: 'Campos obrigatorios ausentes.' }, { status: 400 })
  }

  const result = await createDungeonSession(character_id, user.id, dungeon_type_id, difficulty as DungeonDifficulty)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

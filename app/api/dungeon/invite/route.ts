import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inviteToDungeon } from '@/lib/game/dungeon'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { session_id, leader_id, target_character_id } = await req.json()
  if (!session_id || !leader_id || !target_character_id) {
    return NextResponse.json({ error: 'Campos obrigatorios ausentes.' }, { status: 400 })
  }

  const result = await inviteToDungeon(session_id, leader_id, user.id, target_character_id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

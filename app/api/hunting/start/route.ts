import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startHuntingSession, type HuntingMode } from '@/lib/game/hunting'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, zone_id, mode } = await req.json()
  if (!character_id || !zone_id || !mode) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await startHuntingSession(character_id, user.id, zone_id, mode as HuntingMode)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

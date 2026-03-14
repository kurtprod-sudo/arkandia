import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/game/scenarios'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { scenario_id, character_id, content, is_ooc } = await req.json()
  if (!scenario_id || !character_id || !content) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await sendMessage(scenario_id, character_id, user.id, content, is_ooc ?? false)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

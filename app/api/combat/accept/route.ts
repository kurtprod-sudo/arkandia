import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acceptCombat } from '@/lib/game/combat'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'session_id obrigatório.' }, { status: 400 })

  const result = await acceptCombat(session_id, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

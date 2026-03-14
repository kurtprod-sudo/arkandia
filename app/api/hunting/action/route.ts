import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processHuntingAction } from '@/lib/game/hunting'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { session_id, action } = await req.json()
  if (!session_id || !action) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await processHuntingAction(session_id, user.id, action)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

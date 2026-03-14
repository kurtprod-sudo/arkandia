import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveExpedition } from '@/lib/game/expedition'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { expedition_id } = await req.json()
  if (!expedition_id) {
    return NextResponse.json({ error: 'expedition_id obrigatório.' }, { status: 400 })
  }

  const result = await resolveExpedition(expedition_id, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

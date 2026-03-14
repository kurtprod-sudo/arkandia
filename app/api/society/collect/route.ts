import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { collectTerritoryProduction } from '@/lib/game/economy'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { society_id } = await req.json()
  if (!society_id) {
    return NextResponse.json({ error: 'society_id obrigatório.' }, { status: 400 })
  }

  const result = await collectTerritoryProduction(society_id, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

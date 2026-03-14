import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { declareWar } from '@/lib/game/war'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { attacker_society_id, target_territory_id } = await req.json()
  if (!attacker_society_id || !target_territory_id) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await declareWar(attacker_society_id, target_territory_id, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

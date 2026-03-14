import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recruitTroops, type TroopType } from '@/lib/game/war'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { society_id, troop_type, quantity } = await req.json()
  if (!society_id || !troop_type || !quantity) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await recruitTroops(society_id, user.id, troop_type as TroopType, quantity)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

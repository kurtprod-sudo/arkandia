import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuction } from '@/lib/game/market'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, item_id, quantity, starting_price, duration_hours } = await req.json()
  if (!character_id || !item_id || !quantity || !starting_price || !duration_hours) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await createAuction(character_id, user.id, item_id, quantity, starting_price, duration_hours)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

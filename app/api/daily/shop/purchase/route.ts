import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { purchaseDailyOffer } from '@/lib/game/npc_shop'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, offer_id } = await req.json()
  if (!character_id || !offer_id) return NextResponse.json({ error: 'Campos obrigatórios.' }, { status: 400 })

  const result = await purchaseDailyOffer(character_id, user.id, offer_id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

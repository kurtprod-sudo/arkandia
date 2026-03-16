import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDailyShopOffer } from '@/lib/game/npc_shop'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const characterId = req.nextUrl.searchParams.get('character_id')
  if (!characterId) return NextResponse.json({ error: 'character_id obrigatório.' }, { status: 400 })

  const offer = await getDailyShopOffer(characterId)
  return NextResponse.json({ offer })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { placeBid } from '@/lib/game/market'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { auction_id, bidder_id, amount } = await req.json()
  if (!auction_id || !bidder_id || !amount) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await placeBid(auction_id, bidder_id, user.id, amount)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

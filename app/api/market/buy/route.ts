import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buyListing } from '@/lib/game/market'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { listing_id, buyer_id } = await req.json()
  if (!listing_id || !buyer_id) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await buyListing(listing_id, buyer_id, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

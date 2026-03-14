import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { commitTroops, type TroopType } from '@/lib/game/war'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { war_id, character_id, troops } = await req.json()
  if (!war_id || !character_id || !troops) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await commitTroops(
    war_id, character_id, user.id,
    troops as Partial<Record<TroopType, number>>
  )
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { equipItem } from '@/lib/game/equipment'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, inventory_id, slot_key } = await req.json()
  if (!character_id || !inventory_id || !slot_key) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await equipItem(character_id, user.id, inventory_id, slot_key)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { useHealingPotion } from '@/lib/game/hunting'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id } = await req.json()
  if (!character_id) return NextResponse.json({ error: 'character_id obrigatório.' }, { status: 400 })

  const result = await useHealingPotion(character_id, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

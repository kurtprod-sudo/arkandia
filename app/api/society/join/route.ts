import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { joinSociety } from '@/lib/game/societies'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, society_id } = await req.json()
  if (!character_id || !society_id) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await joinSociety(character_id, user.id, society_id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSociety } from '@/lib/game/societies'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, name, description, manifesto } = await req.json()
  if (!character_id || !name || !description) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await createSociety(character_id, user.id, name, description, manifesto)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

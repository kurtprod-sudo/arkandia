import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startCombat } from '@/lib/game/combat'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { challenger_id, defender_id, modality } = await req.json()
  if (!challenger_id || !defender_id || !modality) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await startCombat(challenger_id, defender_id, modality, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

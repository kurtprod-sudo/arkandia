import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDailyEcho } from '@/lib/narrative/echo'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const characterId = req.nextUrl.searchParams.get('character_id')
  if (!characterId) return NextResponse.json({ error: 'character_id obrigatório.' }, { status: 400 })

  const result = await getDailyEcho(characterId, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

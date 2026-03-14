import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markLetterRead } from '@/lib/narrative/correspondence'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { letter_id } = await req.json()
  if (!letter_id) return NextResponse.json({ error: 'letter_id obrigatório.' }, { status: 400 })

  const result = await markLetterRead(letter_id, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

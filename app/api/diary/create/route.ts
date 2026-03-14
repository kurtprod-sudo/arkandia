import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDiaryEntry } from '@/lib/narrative/diary'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, title, content } = await req.json()
  if (!character_id || !title || !content) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await createDiaryEntry(character_id, user.id, title, content)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

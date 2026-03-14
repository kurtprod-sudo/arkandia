import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteDiaryEntry } from '@/lib/narrative/diary'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { entry_id } = await req.json()
  if (!entry_id) return NextResponse.json({ error: 'entry_id obrigatório.' }, { status: 400 })

  const result = await deleteDiaryEntry(entry_id, user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

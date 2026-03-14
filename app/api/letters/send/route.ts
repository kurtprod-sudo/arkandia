import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLetter } from '@/lib/narrative/correspondence'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { sender_id, recipient_id, subject, content, parent_id } = await req.json()
  if (!sender_id || !recipient_id || !subject || !content) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await sendLetter(sender_id, user.id, recipient_id, subject, content, parent_id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

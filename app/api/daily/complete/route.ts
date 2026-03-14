import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { completeTask, type TaskType } from '@/lib/game/daily'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, task_type } = await req.json()
  if (!character_id || !task_type) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await completeTask(character_id, task_type as TaskType)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

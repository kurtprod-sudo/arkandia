import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateBuilding } from '@/lib/game/skills'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, slots } = await req.json()
  if (!character_id || !Array.isArray(slots)) {
    return NextResponse.json({ error: 'character_id e slots obrigatórios.' }, { status: 400 })
  }

  const result = await updateBuilding(character_id, user.id, slots)
  if (result.success) {
    const { updateMirror } = await import('@/lib/game/coliseu')
    await updateMirror(character_id).catch(() => {})
  }
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

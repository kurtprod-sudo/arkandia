import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { performSummon, type SummonCostType } from '@/lib/game/summon'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id, catalog_id, cost_type } = await req.json()
  if (!character_id || !catalog_id || !cost_type) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const result = await performSummon(
    character_id,
    user.id,
    catalog_id,
    cost_type as SummonCostType
  )
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

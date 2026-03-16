import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAvailableZones } from '@/lib/game/hunting'
import { getZoneBestiaryProgress } from '@/lib/game/bestiary'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()

  const level = Number(req.nextUrl.searchParams.get('level') ?? '1')
  const [zones, bestiaryProgress] = await Promise.all([
    getAvailableZones(level),
    character ? getZoneBestiaryProgress(character.id) : Promise.resolve([]),
  ])
  return NextResponse.json({ zones, bestiaryProgress })
}

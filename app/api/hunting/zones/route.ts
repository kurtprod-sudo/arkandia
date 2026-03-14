import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAvailableZones } from '@/lib/game/hunting'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const level = Number(req.nextUrl.searchParams.get('level') ?? '1')
  const zones = await getAvailableZones(level)
  return NextResponse.json({ zones })
}

import { NextResponse } from 'next/server'
import { getActiveSeason } from '@/lib/game/seasonal'

export async function GET() {
  const season = await getActiveSeason()
  return NextResponse.json({ season })
}

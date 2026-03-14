import { NextRequest, NextResponse } from 'next/server'
import { updateAllRankings } from '@/lib/game/rankings'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await updateAllRankings()
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}

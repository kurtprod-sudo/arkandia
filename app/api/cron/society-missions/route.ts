import { NextRequest, NextResponse } from 'next/server'
import { rollWeeklyMissions } from '@/lib/game/society_missions'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await rollWeeklyMissions()
  return NextResponse.json(result)
}

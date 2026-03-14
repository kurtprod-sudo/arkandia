import { NextRequest, NextResponse } from 'next/server'
import { generateDailyEdition, publishEdition } from '@/lib/narrative/journal'

// Protegido por CRON_SECRET — só Vercel pode chamar
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await generateDailyEdition()
  if (!result.success || !result.editionId) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Auto-publica a edição gerada
  const published = await publishEdition(result.editionId)
  if (!published.success) {
    return NextResponse.json({ error: published.error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    editionId: result.editionId,
  })
}

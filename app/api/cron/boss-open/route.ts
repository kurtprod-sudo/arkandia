import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/game/notifications'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Check if already active
  const { data: active } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .from('world_boss_instances').select('id').eq('status', 'active').maybeSingle()
  if (active) return NextResponse.json({ skipped: true })

  // Find boss to activate
  const { data: boss } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => { order: (k: string, o: Record<string, boolean>) => { limit: (n: number) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } } } })
    .from('world_boss_instances').select('id, hp_max, name')
    .in('status', ['upcoming', 'expired', 'defeated'])
    .order('created_at', { ascending: false }).limit(1).single()
  if (!boss) return NextResponse.json({ error: 'No boss found' }, { status: 404 })

  // Calculate window: now to +3 days
  const windowStart = new Date().toISOString()
  const windowEnd = new Date(Date.now() + 3 * 86400000).toISOString()

  await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } } })
    .from('world_boss_instances').update({
      status: 'active', hp_current: boss.hp_max, total_damage_dealt: 0,
      window_start: windowStart, window_end: windowEnd,
    }).eq('id', boss.id as string)

  // Notify all active characters
  const { data: characters } = await supabase.from('characters').select('id').neq('status', 'dead')
  for (const ch of characters ?? []) {
    await createNotification({
      characterId: ch.id, type: 'general',
      title: `Boss de Mundo: ${boss.name}`,
      body: 'O Boss de Mundo surgiu! Sexta a segunda. Ataque enquanto pode.',
      actionUrl: '/boss',
    })
  }

  return NextResponse.json({ success: true, bossId: boss.id })
}

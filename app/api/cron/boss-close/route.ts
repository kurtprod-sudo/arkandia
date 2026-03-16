import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/game/notifications'
import { grantXp } from '@/lib/game/levelup'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: boss } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { lte: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } } })
    .from('world_boss_instances').select('*').eq('status', 'active')
    .lte('window_end', new Date().toISOString()).single()
  if (!boss) return NextResponse.json({ skipped: true })

  // Mark expired if not defeated
  await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } } })
    .from('world_boss_instances').update({ status: 'expired' })
    .eq('id', boss.id as string).eq('status', 'active')

  // Auto-distribute rewards
  const pool = (boss.reward_pool ?? {}) as Record<string, unknown>
  const hpMax = boss.hp_max as number

  const { data: contribs } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { gt: (k: string, v: number) => { eq: (k: string, v: boolean) => Promise<{ data: Array<Record<string, unknown>> | null }> } } } } })
    .from('world_boss_contributions').select('character_id, damage_dealt')
    .eq('boss_id', boss.id as string).gt('damage_dealt', 0).eq('reward_claimed', false)

  let rewarded = 0
  for (const c of contribs ?? []) {
    const pct = (c.damage_dealt as number) / hpMax
    const libras = Math.max(1, Math.floor(pct * ((pool.libras as number) ?? 0)))
    const essencia = Math.max(1, Math.floor(pct * ((pool.essencia as number) ?? 0)))
    const xp = Math.max(1, Math.floor(pct * ((pool.xp as number) ?? 0)))

    const { data: wallet } = await supabase.from('character_wallet')
      .select('libras, essencia').eq('character_id', c.character_id as string).single()
    if (wallet) {
      await supabase.from('character_wallet').update({
        libras: wallet.libras + libras, essencia: wallet.essencia + essencia,
      } as never).eq('character_id', c.character_id as string)
    }
    await grantXp(c.character_id as string, xp, supabase)

    await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } } })
      .from('world_boss_contributions').update({ reward_claimed: true })
      .eq('boss_id', boss.id as string).eq('character_id', c.character_id as string)

    await createNotification({
      characterId: c.character_id as string, type: 'general',
      title: 'Boss de Mundo — Recompensa',
      body: `+${libras} Libras, +${essencia} Essências, +${xp} XP.`,
      actionUrl: '/boss',
    })
    rewarded++
  }

  return NextResponse.json({ success: true, rewarded })
}

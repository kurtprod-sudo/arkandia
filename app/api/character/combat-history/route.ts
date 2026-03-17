import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '20'), 50)

  const { data: sessions, error } = await supabase
    .from('combat_sessions')
    .select(`
      id,
      modality,
      status,
      winner_id,
      finished_at,
      created_at,
      challenger:characters!combat_sessions_challenger_id_fkey(id, name, level),
      defender:characters!combat_sessions_defender_id_fkey(id, name, level)
    `)
    .or(`challenger_id.eq.${character.id},defender_id.eq.${character.id}`)
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const history = (sessions ?? []).map((s) => {
    const isChallenger = (s.challenger as Record<string, unknown>)?.id === character.id
    const opponent = isChallenger
      ? (s.defender as Record<string, unknown>)
      : (s.challenger as Record<string, unknown>)
    const won = s.winner_id === character.id

    return {
      id: s.id,
      modality: s.modality,
      opponentName: (opponent?.name as string) ?? '?',
      opponentLevel: (opponent?.level as number) ?? 1,
      won,
      finishedAt: s.finished_at,
    }
  })

  return NextResponse.json({ history })
}

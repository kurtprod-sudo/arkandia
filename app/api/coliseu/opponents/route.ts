import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAvailableOpponents, getOrCreateMirror, getColiseuTier, getChallengeExtraCost } from '@/lib/game/coliseu'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })

  const [mirror, opponents] = await Promise.all([
    getOrCreateMirror(character.id),
    getAvailableOpponents(character.id),
  ])

  const today = new Date().toISOString().split('T')[0]
  const used = mirror.lastChallengeDate === today ? mirror.dailyChallengesUsed : 0
  const nextCost = getChallengeExtraCost(used)

  return NextResponse.json({
    mirror: { ...mirror, tier: getColiseuTier(mirror.coliseuPoints) },
    opponents: opponents.map((o) => ({ ...o, tier: getColiseuTier(o.coliseuPoints) })),
    challengesUsedToday: used,
    nextChallengeCost: nextCost,
  })
}

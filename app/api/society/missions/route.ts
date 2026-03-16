import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateSocietyMissions, getSocietyMissionHistory, getMissionContributors } from '@/lib/game/society_missions'
import { getWeekStart } from '@/lib/utils/formulas'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: character } = await supabase
    .from('characters').select('id, society_id').eq('user_id', user.id).single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })
  if (!character.society_id) return NextResponse.json({ missions: null, history: null })

  const [record, history] = await Promise.all([
    getOrCreateSocietyMissions(character.society_id),
    getSocietyMissionHistory(character.society_id, 4),
  ])

  // Get contributors for each mission
  const weekStart = getWeekStart()
  const missionsWithContributors = record ? await Promise.all(
    record.missions.map(async (m) => {
      const contributors = await getMissionContributors(character.society_id as string, m.type, weekStart)
      return { ...m, top3Contributors: contributors }
    })
  ) : []

  return NextResponse.json({
    missions: record ? { ...record, missions: missionsWithContributors } : null,
    history,
  })
}

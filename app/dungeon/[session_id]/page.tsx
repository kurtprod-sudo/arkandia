import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DungeonRoom from '@/components/dungeon/DungeonRoom'

interface Props {
  params: { session_id: string }
}

export default async function DungeonSessionPage({ params }: Props) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!character) redirect('/character/create')

  const { data: session } = await supabase
    .from('dungeon_sessions')
    .select('*, dungeon_types(*)')
    .eq('id', params.session_id)
    .single()

  if (!session) redirect('/dungeon')

  const { data: participants } = await supabase
    .from('dungeon_participants')
    .select('*, characters(id, name, level, avatar_url, title)')
    .eq('session_id', params.session_id)

  const { data: myParticipant } = await supabase
    .from('dungeon_participants')
    .select('status')
    .eq('session_id', params.session_id)
    .eq('character_id', character.id)
    .maybeSingle()

  // Busca recompensas se dungeon finalizada
  let rewards: Array<{ character_id: string; xp_granted: number; libras_granted: number }> = []
  if (session.status === 'finished' || session.status === 'failed') {
    const { data: r } = await supabase
      .from('dungeon_rewards')
      .select('character_id, xp_granted, libras_granted')
      .eq('session_id', params.session_id)
    rewards = r ?? []
  }

  const dungeonType = session.dungeon_types as Record<string, unknown>

  return (
    <main className="min-h-screen relative">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[#6e160f]/6 blur-[160px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <DungeonRoom
          sessionId={params.session_id}
          characterId={character.id}
          isLeader={session.leader_id === character.id}
          myStatus={(myParticipant?.status as string) ?? null}
          initialSession={{
            id: session.id,
            status: session.status as string,
            difficulty: session.difficulty as string,
            currentPhase: session.current_phase as number,
            totalPhases: (dungeonType.phases as number) ?? 3,
            result: (session.result as string) ?? null,
            phaseLog: (session.phase_log as Array<{ phase: number; narrative: string; success: boolean; casualties: string[] }>) ?? [],
            dungeonName: (dungeonType.name as string) ?? 'Dungeon',
            dungeonDescription: (dungeonType.description as string) ?? '',
            maxPlayers: (dungeonType.max_players as number) ?? 4,
          }}
          initialParticipants={(participants ?? []).map((p) => {
            const char = p.characters as Record<string, unknown> | null
            return {
              characterId: p.character_id as string,
              name: (char?.name as string) ?? '?',
              level: (char?.level as number) ?? 1,
              status: p.status as string,
              title: (char?.title as string) ?? null,
            }
          })}
          rewards={rewards}
        />
      </div>
    </main>
  )
}

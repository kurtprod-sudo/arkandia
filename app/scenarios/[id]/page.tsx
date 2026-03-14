import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ScenarioChat from '@/components/scenarios/ScenarioChat'

interface PageProps {
  params: { id: string }
}

export default async function ScenarioPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Busca cenário
  const { data: scenario } = await supabase
    .from('social_scenarios')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!scenario) redirect('/scenarios')

  // Busca personagem do usuário
  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level, classes(name), races(name)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!character) redirect('/character/create')

  const [
    { data: presence },
    { data: presentCharacters },
    { data: messages },
  ] = await Promise.all([
    // Verifica se já está presente
    supabase
      .from('scenario_presence')
      .select('id')
      .eq('scenario_id', id)
      .eq('character_id', character.id)
      .maybeSingle(),
    // Busca presença atual
    supabase
      .from('scenario_presence')
      .select('character_id, characters(id, name, level, classes(name))')
      .eq('scenario_id', id),
    // Últimas 50 mensagens
    supabase
      .from('scenario_messages')
      .select('*, characters(id, name)')
      .eq('scenario_id', id)
      .order('created_at', { ascending: true })
      .limit(50),
  ])

  const initialMessages = (messages ?? []).map((m) => ({
    id: m.id as string,
    characterId: m.character_id as string,
    characterName: ((m.characters as Record<string, unknown>)?.name as string) ?? '???',
    content: m.content as string,
    isOoc: (m.is_ooc as boolean) ?? false,
    createdAt: m.created_at as string,
  }))

  const initialPresence = (presentCharacters ?? []).map((p) => {
    const ch = p.characters as Record<string, unknown> | null
    return {
      characterId: p.character_id as string,
      characterName: (ch?.name as string) ?? '???',
      characterLevel: (ch?.level as number) ?? 1,
      characterClass: ((ch?.classes as Record<string, unknown>)?.name as string) ?? '',
    }
  })

  return (
    <main className="min-h-screen relative bg-[var(--ark-void)]">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[var(--ark-red)]/6 blur-[150px] pointer-events-none" />

      <div className="relative z-10 h-screen flex flex-col">
        <ScenarioChat
          scenarioId={id}
          scenario={{
            name: scenario.name,
            description: scenario.description,
            location: scenario.location,
            max_players: scenario.max_players,
          }}
          myCharacter={{ id: character.id, name: character.name }}
          initialMessages={initialMessages}
          initialPresence={initialPresence}
          isAlreadyPresent={!!presence}
        />
      </div>
    </main>
  )
}

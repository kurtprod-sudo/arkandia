import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CombatArena from '@/components/combat/CombatArena'

interface CombatPageProps {
  params: Promise<{ session_id: string }>
}

export default async function CombatPage({ params }: CombatPageProps) {
  const { session_id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Busca sessão de combate
  const { data: session } = await supabase
    .from('combat_sessions')
    .select('*')
    .eq('id', session_id)
    .single()

  if (!session) redirect('/dashboard')

  // Busca dados dos dois personagens
  const [{ data: challenger }, { data: defender }] = await Promise.all([
    supabase
      .from('characters')
      .select('id, name, level, classes (name)')
      .eq('id', session.challenger_id)
      .single(),
    supabase
      .from('characters')
      .select('id, name, level, classes (name)')
      .eq('id', session.defender_id)
      .single(),
  ])

  if (!challenger || !defender) redirect('/dashboard')

  // Busca atributos de ambos
  const [{ data: challengerAttrs }, { data: defenderAttrs }] = await Promise.all([
    supabase
      .from('character_attributes')
      .select('hp_atual, hp_max, eter_atual, eter_max')
      .eq('character_id', session.challenger_id)
      .single(),
    supabase
      .from('character_attributes')
      .select('hp_atual, hp_max, eter_atual, eter_max')
      .eq('character_id', session.defender_id)
      .single(),
  ])

  // Busca building do personagem do usuário
  const myCharacterId = challenger.id === session.challenger_id
    ? (await supabase.from('characters').select('id').eq('user_id', user.id).single()).data?.id
    : undefined
  const isChallenger = myCharacterId === session.challenger_id

  const myId = isChallenger ? session.challenger_id : session.defender_id

  const { data: building } = await supabase
    .from('character_building')
    .select('slot, skill_id, skills (id, name, skill_type, eter_cost, range_state, description)')
    .eq('character_id', myId)
    .order('slot')

  // Busca histórico de turnos
  const { data: turns } = await supabase
    .from('combat_turns')
    .select('*')
    .eq('session_id', session_id)
    .order('turn_number', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-[var(--ark-bg)] p-4">
      <CombatArena
        sessionId={session_id}
        session={{
          status: session.status,
          currentTurn: session.current_turn,
          activePlayerId: session.active_player_id,
          turnExpiresAt: session.turn_expires_at,
          winnerId: session.winner_id,
          modality: session.modality,
          challengerId: session.challenger_id,
          defenderId: session.defender_id,
        }}
        challenger={{
          id: challenger.id,
          name: challenger.name,
          level: challenger.level,
          className: (challenger.classes as { name: string } | null)?.name ?? '',
          hpAtual: challengerAttrs?.hp_atual ?? 0,
          hpMax: challengerAttrs?.hp_max ?? 1,
          eterAtual: challengerAttrs?.eter_atual ?? 0,
          eterMax: challengerAttrs?.eter_max ?? 1,
        }}
        defender={{
          id: defender.id,
          name: defender.name,
          level: defender.level,
          className: (defender.classes as { name: string } | null)?.name ?? '',
          hpAtual: defenderAttrs?.hp_atual ?? 0,
          hpMax: defenderAttrs?.hp_max ?? 1,
          eterAtual: defenderAttrs?.eter_atual ?? 0,
          eterMax: defenderAttrs?.eter_max ?? 1,
        }}
        myCharacterId={myId}
        building={(building ?? []).map((s) => ({
          slot: s.slot,
          skillId: s.skill_id,
          skill: s.skills as { id: string; name: string; skill_type: string; eter_cost: number; range_state: string; description: string } | null,
        }))}
        initialTurns={(turns ?? []).map((t) => ({
          turnNumber: t.turn_number,
          actorId: t.actor_id,
          actionType: t.action_type,
          damageDealt: t.damage_dealt ?? 0,
          narrativeText: t.narrative_text ?? '',
        }))}
      />
    </div>
  )
}

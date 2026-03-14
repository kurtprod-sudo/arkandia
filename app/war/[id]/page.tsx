import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WarPanel from '@/components/war/WarPanel'
import Link from 'next/link'
import ArkButton from '@/components/ui/ArkButton'
import ArkDivider from '@/components/ui/ArkDivider'

interface PageProps {
  params: { id: string }
}

export default async function WarPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = params

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level, society_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!character) redirect('/character/create')

  const { data: war } = await supabase
    .from('war_declarations')
    .select('*, territories(name, region)')
    .eq('id', id)
    .single()

  if (!war) redirect('/map')

  // Fetch attacker and defender names separately to avoid alias issues
  const [{ data: attackerSociety }, defenderRes, { data: battles }, { data: participants }] = await Promise.all([
    supabase.from('societies').select('name').eq('id', war.attacker_id).single(),
    war.defender_id
      ? supabase.from('societies').select('name').eq('id', war.defender_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('war_battles')
      .select('*')
      .eq('war_id', id)
      .order('phase'),
    supabase
      .from('war_participants')
      .select('side, troops_committed, characters(name, level)')
      .eq('war_id', id),
  ])

  // Fetch troops for player's society
  let myTroops: Array<{ troop_type: string; quantity: number }> = []
  if (character.society_id) {
    const { data } = await supabase
      .from('troops')
      .select('troop_type, quantity')
      .eq('society_id', character.society_id)
    myTroops = data ?? []
  }

  const territory = war.territories as Record<string, unknown> | null
  const attackerName = attackerSociety?.name ?? '???'
  const defenderName = (defenderRes?.data as Record<string, unknown> | null)?.name as string ?? 'Sem defensor'

  // Determine if player is part of this war
  const isAttacker = character.society_id === war.attacker_id
  const isDefender = character.society_id === war.defender_id
  const isParticipant = isAttacker || isDefender

  return (
    <main className="min-h-screen relative bg-[var(--ark-void)]">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[var(--ark-red)]/8 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              Guerra: {(territory?.name as string) ?? 'Território'}
            </h1>
            <p className="text-sm text-[var(--text-label)] font-body mt-1">
              {(territory?.region as string) ?? ''}
            </p>
          </div>
          <Link href="/map">
            <ArkButton variant="ghost" size="sm">&larr; Mapa</ArkButton>
          </Link>
        </div>

        <ArkDivider variant="dark" />

        <WarPanel
          warId={id}
          war={{
            status: war.status as string,
            phase: war.phase as number,
            preparationEnds: war.preparation_ends as string,
            finishedAt: war.finished_at as string | null,
            winnerId: war.winner_id as string | null,
            attackerId: war.attacker_id as string,
            defenderId: war.defender_id as string | null,
          }}
          attackerName={attackerName as string}
          defenderName={defenderName}
          territoryName={(territory?.name as string) ?? ''}
          battles={(battles ?? []).map((b) => ({
            id: b.id as string,
            phase: b.phase as number,
            attackerPower: b.attacker_power as number,
            defenderPower: b.defender_power as number,
            winnerSide: b.winner_side as string | null,
            narrativeText: b.narrative_text as string | null,
          }))}
          participants={(participants ?? []).map((p) => {
            const ch = p.characters as Record<string, unknown> | null
            return {
              name: (ch?.name as string) ?? '???',
              level: (ch?.level as number) ?? 1,
              side: p.side as string,
              troopsCommitted: p.troops_committed as Record<string, number>,
            }
          })}
          myCharacter={{
            id: character.id,
            societyId: character.society_id,
          }}
          myTroops={myTroops.map((t) => ({
            troopType: t.troop_type,
            quantity: t.quantity,
          }))}
          isParticipant={isParticipant}
        />
      </div>
    </main>
  )
}

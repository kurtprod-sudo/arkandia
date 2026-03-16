import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GmPanel, { type GmPanelProps } from '@/components/gm/GmPanel'
import { type CharacterWithAttributes, type GameEvent } from '@/types'

export default async function GMPanelPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, username')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'gm') redirect('/dashboard')

  // Parallel data fetching
  const [
    { data: characters },
    { data: events },
    { data: societies },
    { data: territories },
    { data: activeWars },
    { data: titleDefs },
    { data: summonCatalogs },
    { data: unconfirmedLore },
    { data: recentPayments },
    { data: allScenarios },
    { data: journalEditions },
    { data: allItems },
    { data: factions },
  ] = await Promise.all([
    // Todos os personagens com atributos
    supabase
      .from('characters')
      .select('*, character_attributes (*), character_wallet (*)')
      .order('created_at', { ascending: false }),

    // Últimos 50 eventos
    supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),

    // Sociedades ativas
    supabase
      .from('societies')
      .select('id, name, level, treasury_libras, recruitment_open, dissolved_at')
      .is('dissolved_at', null)
      .order('name'),

    // Territórios com sociedade controladora
    supabase
      .from('territories')
      .select('id, name, region, category, controlling_society_id, safezone_until, societies (name)')
      .order('region'),

    // Guerras ativas
    supabase
      .from('war_declarations')
      .select('id, status, created_at, attacker:societies!attacker_id (name), defender:societies!defender_id (name), territories:territories!target_territory_id (name)')
      .in('status', ['declared', 'battle_phase']),

    // Definições de título
    supabase
      .from('title_definitions')
      .select('id, name, category, is_unique')
      .order('category'),

    // Catálogos de summon
    supabase
      .from('summon_catalogs')
      .select('id, name, is_active, cost_gemas, pity_threshold')
      .order('created_at', { ascending: false }),

    // Lore não confirmada
    supabase
      .from('diary_entries')
      .select('id, title, character_id, characters:characters!character_id (name)')
      .eq('is_lore_confirmed', false)
      .order('created_at', { ascending: false })
      .limit(30),

    // Pagamentos recentes
    supabase
      .from('payments')
      .select('id, character_id, status, amount_brl, gemas_amount, created_at, characters:characters!character_id (name)')
      .order('created_at', { ascending: false })
      .limit(50),

    // Cenários
    supabase
      .from('social_scenarios')
      .select('id, name, location, is_active, scenario_presence (count)')
      .order('created_at', { ascending: false }),

    // Edições do jornal
    supabase
      .from('journal_editions')
      .select('id, edition_date, status, published_at')
      .order('edition_date', { ascending: false })
      .limit(20),

    // Todos os itens
    supabase
      .from('items')
      .select('id, name, item_type, rarity')
      .order('name'),

    // Facções
    supabase
      .from('factions')
      .select('id, slug, name')
      .order('name'),
  ])

  // Tournament data (separate query for complex joins)
  const { data: tournamentsRaw } = await supabase
    .from('tournaments')
    .select('id, name, status, max_participants')
    .neq('status', 'finished')
    .order('created_at', { ascending: false })

  const tournamentData = []
  for (const t of tournamentsRaw ?? []) {
    const { count: participantCount } = await supabase
      .from('tournament_participants')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', t.id)

    const { data: matchesRaw } = await supabase
      .from('tournament_matches')
      .select('id, round, match_number, status, is_bye, participant_a_id, participant_b_id')
      .eq('tournament_id', t.id)
      .order('round')
      .order('match_number')

    const matchesWithNames = []
    for (const m of matchesRaw ?? []) {
      let aName: string | null = null
      let bName: string | null = null
      if (m.participant_a_id) {
        const { data: pa } = await supabase.from('tournament_participants').select('characters(name)').eq('id', m.participant_a_id).single()
        aName = (pa?.characters as Record<string, unknown> | null)?.name as string ?? null
      }
      if (m.participant_b_id) {
        const { data: pb } = await supabase.from('tournament_participants').select('characters(name)').eq('id', m.participant_b_id).single()
        bName = (pb?.characters as Record<string, unknown> | null)?.name as string ?? null
      }
      matchesWithNames.push({ ...m, participant_a_name: aName, participant_b_name: bName })
    }

    tournamentData.push({
      ...t,
      participantCount: participantCount ?? 0,
      matches: matchesWithNames,
    })
  }

  return (
    <main className="min-h-screen relative">
      {/* Background glow — crimson for GM authority */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-[#6e160f]/8 blur-[180px] pointer-events-none" />

      {/* GM Navbar */}
      <nav className="border-b border-[var(--ark-border)] px-6 py-3 flex items-center justify-between bg-[var(--ark-surface)] backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-3">
          <span className="font-display text-[var(--ark-red-glow)] text-lg">GM Panel</span>
          <span className="text-[var(--text-label)] text-sm font-body">— Arkandia</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-body">
            Dashboard
          </Link>
          <span className="text-[var(--ark-red-glow)] text-sm font-data">{profile.username}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <GmPanel
          characters={(characters ?? []) as CharacterWithAttributes[]}
          events={(events ?? []) as GameEvent[]}
          societies={(societies ?? []) as GmPanelProps['societies']}
          territories={(territories ?? []) as GmPanelProps['territories']}
          activeWars={(activeWars ?? []) as GmPanelProps['activeWars']}
          titleDefs={(titleDefs ?? []) as GmPanelProps['titleDefs']}
          summonCatalogs={(summonCatalogs ?? []) as GmPanelProps['summonCatalogs']}
          unconfirmedLore={(unconfirmedLore ?? []) as GmPanelProps['unconfirmedLore']}
          recentPayments={(recentPayments ?? []) as GmPanelProps['recentPayments']}
          allScenarios={(allScenarios ?? []) as GmPanelProps['allScenarios']}
          journalEditions={(journalEditions ?? []) as GmPanelProps['journalEditions']}
          allItems={(allItems ?? []) as GmPanelProps['allItems']}
          factions={(factions ?? []) as GmPanelProps['factions']}
          tournaments={tournamentData}
        />
      </div>
    </main>
  )
}

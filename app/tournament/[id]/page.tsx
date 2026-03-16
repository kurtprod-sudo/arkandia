import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { registerForTournamentAction } from '@/app/actions/tournament'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import ArkDivider from '@/components/ui/ArkDivider'

const STATUS_LABELS: Record<string, string> = {
  open: 'Inscrições Abertas', closed: 'Inscrições Encerradas',
  bracket_generated: 'Bracket Gerado', in_progress: 'Em Andamento', finished: 'Encerrado',
}
const STATUS_COLORS: Record<string, 'alive' | 'injured' | 'crimson' | 'gold' | 'bronze'> = {
  open: 'alive', closed: 'injured', bracket_generated: 'gold', in_progress: 'crimson', finished: 'bronze',
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()

  const { data: tournament } = await supabase
    .from('tournaments').select('*').eq('id', id).single()
  if (!tournament) redirect('/tournament')

  const [{ data: participants }, { data: matches }] = await Promise.all([
    supabase.from('tournament_participants')
      .select('*, characters(name, level)')
      .eq('tournament_id', id)
      .order('seed'),
    supabase.from('tournament_matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round')
      .order('match_number'),
  ])

  const isRegistered = (participants ?? []).some(
    (p) => p.character_id === character?.id
  )
  const participantCount = participants?.length ?? 0
  const canRegister = tournament.status === 'open'
    && !isRegistered
    && !!character
    && participantCount < tournament.max_participants
    && new Date(tournament.registration_ends_at) > new Date()

  const prize = tournament.prize_pool as Record<string, Record<string, number>> | null
  const maxP = tournament.max_participants as number
  const totalRounds = Math.log2(maxP)

  // Group matches by round
  const matchesByRound: Record<number, typeof matches> = {}
  for (const m of matches ?? []) {
    const r = m.round as number
    if (!matchesByRound[r]) matchesByRound[r] = []
    matchesByRound[r].push(m)
  }

  // Build participant name map
  const pMap: Record<string, { name: string; level: number }> = {}
  for (const p of participants ?? []) {
    const ch = p.characters as Record<string, unknown> | null
    if (ch) pMap[p.id] = { name: ch.name as string, level: ch.level as number }
  }

  async function handleRegister() {
    'use server'
    await registerForTournamentAction(id)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-display font-bold text-[var(--text-primary)]">
          {tournament.name}
        </h1>
        <ArkBadge color={STATUS_COLORS[tournament.status] ?? 'bronze'} className="text-[9px]">
          {STATUS_LABELS[tournament.status] ?? tournament.status}
        </ArkBadge>
      </div>
      {tournament.description && (
        <p className="text-xs font-body text-[var(--text-secondary)] mb-2">{tournament.description}</p>
      )}
      <div className="flex gap-4 text-[10px] font-data text-[var(--text-label)] mb-4">
        <span>{participantCount}/{maxP} participantes</span>
        {tournament.status === 'open' && (
          <span>Inscrições até {new Date(tournament.registration_ends_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>

      {/* Register */}
      {canRegister && (
        <form action={handleRegister} className="mb-6">
          <ArkButton type="submit">Inscrever-se</ArkButton>
        </form>
      )}
      {isRegistered && tournament.status === 'open' && (
        <p className="text-xs font-data text-status-alive mb-6">Inscrito</p>
      )}

      <ArkDivider variant="dark" className="mb-6" />

      {/* Prize pool */}
      {prize && (
        <div className="bg-[var(--ark-surface)] rounded-sm p-4 border border-[var(--ark-border)] mb-6">
          <h3 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Premiação</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {(['first', 'second', 'third'] as const).map((pos, i) => {
              const p = prize[pos]
              return (
                <div key={pos}>
                  <p className="text-xs font-data font-semibold text-[var(--text-primary)]">{i + 1}º</p>
                  <p className="text-[10px] font-data text-[var(--ark-gold-bright)]">
                    {p?.libras ? `${p.libras}£` : ''}{p?.gemas ? ` ${p.gemas}G` : ''}
                    {!p?.libras && !p?.gemas && '—'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bracket */}
      {Object.keys(matchesByRound).length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Bracket</h3>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {Array.from({ length: totalRounds }, (_, r) => r + 1).map((round) => {
              const roundLabel = round === totalRounds ? 'Final'
                : round === totalRounds - 1 ? 'Semis'
                : `R${round}`
              const roundMatches = matchesByRound[round] ?? []
              return (
                <div key={round} className="flex-shrink-0 w-48">
                  <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2 text-center">
                    {roundLabel}
                  </p>
                  <div className="space-y-2">
                    {roundMatches.map((m) => {
                      const aName = m.participant_a_id ? pMap[m.participant_a_id]?.name ?? '?' : '—'
                      const bName = m.participant_b_id ? pMap[m.participant_b_id]?.name ?? '?' : '—'
                      const isFinished = m.status === 'finished'
                      const isWaiting = m.status === 'waiting_combat'

                      return (
                        <div
                          key={m.id}
                          className={`border rounded-sm p-2 text-xs ${
                            isFinished ? 'border-[var(--text-ghost)]/30' :
                            isWaiting ? 'border-[var(--ark-red-glow)]/50 bg-[var(--ark-red)]/5' :
                            'border-[var(--ark-border)]'
                          }`}
                        >
                          {m.is_bye ? (
                            <div className="text-center">
                              <p className="font-data text-[var(--text-primary)]">{aName}</p>
                              <p className="text-[9px] text-[var(--text-ghost)] italic">BYE</p>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className={`font-data ${m.winner_id === m.participant_a_id ? 'text-[var(--ark-gold-bright)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                                  {aName}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className={`font-data ${m.winner_id === m.participant_b_id ? 'text-[var(--ark-gold-bright)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                                  {bName}
                                </span>
                              </div>
                              {isWaiting && m.combat_session_id && (
                                <a
                                  href={`/combat`}
                                  className="block mt-1 text-[9px] font-data text-[var(--ark-red-glow)] text-center uppercase tracking-wider"
                                >
                                  Entrar na Arena →
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Participants */}
      <div>
        <h3 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Participantes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {(participants ?? []).map((p) => {
            const ch = p.characters as Record<string, unknown> | null
            return (
              <div key={p.id} className="flex items-center gap-2 p-2 text-xs">
                {p.seed && <span className="text-[var(--text-ghost)] font-data w-5">#{p.seed}</span>}
                <span className={`font-data ${p.eliminated_at ? 'text-[var(--text-ghost)] line-through' : 'text-[var(--text-primary)]'}`}>
                  {(ch?.name as string) ?? '?'}
                </span>
                {p.final_position && (
                  <ArkBadge color="gold" className="text-[7px]">{p.final_position}º</ArkBadge>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

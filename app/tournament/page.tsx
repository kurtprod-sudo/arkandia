import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkBadge from '@/components/ui/ArkBadge'
import ArkDivider from '@/components/ui/ArkDivider'

const STATUS_LABELS: Record<string, string> = {
  open: 'Inscrições Abertas',
  closed: 'Inscrições Encerradas',
  bracket_generated: 'Bracket Gerado',
  in_progress: 'Em Andamento',
  finished: 'Encerrado',
}

const STATUS_COLORS: Record<string, 'alive' | 'injured' | 'crimson' | 'gold' | 'bronze'> = {
  open: 'alive',
  closed: 'injured',
  bracket_generated: 'gold',
  in_progress: 'crimson',
  finished: 'bronze',
}

export default async function TournamentListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*, tournament_participants(count)')
    .order('created_at', { ascending: false })

  const active = (tournaments ?? []).filter((t) => t.status !== 'finished')
  const finished = (tournaments ?? []).filter((t) => t.status === 'finished')

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Torneios
      </h1>
      <ArkDivider variant="dark" className="mb-6" />

      {active.length > 0 && (
        <div className="space-y-3 mb-8">
          {active.map((t) => {
            const prize = t.prize_pool as Record<string, Record<string, number>> | null
            const firstPrize = prize?.first
            const count = (t.tournament_participants as Array<{ count: number }>)?.[0]?.count ?? 0
            return (
              <Link key={t.id} href={`/tournament/${t.id}`}>
                <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-data font-semibold text-[var(--text-primary)]">{t.name}</h3>
                    <ArkBadge color={STATUS_COLORS[t.status] ?? 'bronze'} className="text-[9px]">
                      {STATUS_LABELS[t.status] ?? t.status}
                    </ArkBadge>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-data text-[var(--text-label)]">
                    <span>{count}/{t.max_participants} vagas</span>
                    {t.status === 'open' && (
                      <span>Até {new Date(t.registration_ends_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    {firstPrize && (
                      <span className="text-[var(--ark-gold-bright)]">
                        1º: {firstPrize.libras ? `${firstPrize.libras}£` : ''}{firstPrize.gemas ? ` ${firstPrize.gemas}G` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {active.length === 0 && (
        <p className="text-xs font-body text-[var(--text-label)] italic text-center py-8">
          Nenhum torneio ativo no momento.
        </p>
      )}

      {finished.length > 0 && (
        <>
          <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Encerrados</h2>
          <div className="space-y-2 opacity-60">
            {finished.slice(0, 5).map((t) => (
              <Link key={t.id} href={`/tournament/${t.id}`}>
                <div className="bg-[var(--ark-surface)] rounded-sm p-3 border border-[var(--ark-border)] flex items-center justify-between">
                  <span className="text-xs font-data text-[var(--text-secondary)]">{t.name}</span>
                  <ArkBadge color="bronze" className="text-[8px]">Encerrado</ArkBadge>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import ArkButton from '@/components/ui/ArkButton'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import type { JournalSection } from '@/types'
import { getDailyTasks, updateLoginStreak } from '@/lib/game/daily'
import DailyTasksWidget from '@/components/dashboard/DailyTasksWidget'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level, status, races (name), classes (name)')
    .eq('user_id', user.id)
    .single()

  const [{ data: publicEvents }, { data: latestJournal }] = await Promise.all([
    supabase
      .from('events')
      .select('id, type, narrative_text, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('journal_editions')
      .select('id, edition_date, sections, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Daily tasks + streak + unread letters + wallet (só se tiver personagem)
  let dailyData: { tasks: import('@/types').DailyTask[]; completedCount: number; ticketGranted: boolean } | null = null
  let streakData: { currentStreak: number } | null = null
  let unreadLetters = 0
  let walletGemas = 0

  if (character) {
    const [daily, streak, { count }, { data: wallet }] = await Promise.all([
      getDailyTasks(character.id),
      updateLoginStreak(character.id),
      supabase
        .from('letters')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', character.id)
        .eq('is_read', false),
      supabase
        .from('character_wallet')
        .select('premium_currency')
        .eq('character_id', character.id)
        .single(),
    ])
    dailyData = { tasks: daily.tasks, completedCount: daily.completedCount, ticketGranted: daily.ticketGranted }
    streakData = { currentStreak: streak.currentStreak }
    unreadLetters = count ?? 0
    walletGemas = wallet?.premium_currency ?? 0
  }

  const STATUS_LABELS: Record<string, string> = {
    active: 'Vivo', injured: 'Ferido', dead: 'Morto',
  }

  const STATUS_BADGE: Record<string, 'alive' | 'injured' | 'dead'> = {
    active: 'alive', injured: 'injured', dead: 'dead',
  }

  return (
    <main className="min-h-screen relative">
      {/* Background effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#6e160f]/6 blur-[150px] pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-[var(--ark-border)] px-6 py-3 flex items-center justify-between bg-[var(--ark-surface)] backdrop-blur-xl relative z-10">
        <Link href="/dashboard" className="font-display text-[var(--ark-gold-bright)] text-lg">
          Arkandia
        </Link>
        <div className="flex items-center gap-4">
          {profile?.role === 'gm' && (
            <Link href="/gm" className="text-sm text-[var(--ark-red-glow)] hover:text-[var(--ark-red-glow)]/80 transition-colors font-body">
              Painel GM
            </Link>
          )}
          <span className="text-[var(--text-label)] text-sm font-body">{profile?.username}</span>
          <form action={logout}>
            <button className="text-sm text-[var(--text-label)] hover:text-[var(--text-primary)] transition-colors font-body">
              Sair
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 relative z-10">

        {/* Character Card */}
        {character ? (
          <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider">
                Meu Personagem
              </h2>
              <Link
                href="/character"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-body"
              >
                Ver ficha completa &rarr;
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#6e160f]/30 border-2 border-[var(--ark-border-bright)] flex items-center justify-center text-2xl font-display font-bold text-[var(--text-primary)]">
                {character.name.charAt(0)}
              </div>
              <div>
                <p className="text-xl font-display font-bold text-[var(--ark-gold-bright)]">{character.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[var(--text-secondary)] text-sm font-body">
                    Nv {character.level}
                  </span>
                  <span className="text-[var(--text-ghost)]">•</span>
                  <span className="text-[var(--text-label)] text-xs font-data">
                    {(character.races as { name: string } | null)?.name ?? '—'}
                    {' · '}
                    {(character.classes as { name: string } | null)?.name ?? '—'}
                  </span>
                  <ArkBadge color={STATUS_BADGE[character.status]} className="text-[10px]">
                    {STATUS_LABELS[character.status]}
                  </ArkBadge>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)] text-center">
            <p className="text-[var(--text-secondary)] mb-4 font-body">Você ainda não criou seu personagem.</p>
            <Link href="/character/create">
              <ArkButton size="lg">Criar Personagem</ArkButton>
            </Link>
          </div>
        )}

        {/* Daily Tasks */}
        {character && dailyData && streakData && (
          <DailyTasksWidget
            tasks={dailyData.tasks}
            completedCount={dailyData.completedCount}
            ticketGranted={dailyData.ticketGranted}
            characterId={character.id}
            streak={streakData.currentStreak}
          />
        )}

        {/* Correspondência */}
        {character && (
          <Link href="/letters" className="block">
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Correspondência
                  </h2>
                  <p className="text-sm text-[var(--text-label)] font-body">
                    {unreadLetters > 0
                      ? `${unreadLetters} carta${unreadLetters > 1 ? 's' : ''} não lida${unreadLetters > 1 ? 's' : ''}`
                      : 'Caixa vazia'}
                  </p>
                </div>
                {unreadLetters > 0 && (
                  <span className="px-2.5 py-1 text-sm font-data font-bold bg-[var(--ark-red)]/40 text-[var(--ark-red-glow)] border border-[var(--ark-red)]/60 rounded">
                    {unreadLetters}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Loja de Gemas */}
        {character && (
          <Link href="/shop" className="block">
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Loja de Gemas
                  </h2>
                  <p className="text-sm text-[var(--text-label)] font-body">
                    Saldo: {walletGemas} Gemas
                  </p>
                </div>
                <svg className="text-status-alive" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 2L1 8l11 13L23 8l-5-6H6zm1.2 1.5h9.6l3.5 4.2L12 19.5 3.7 7.7l3.5-4.2z" />
                </svg>
              </div>
            </div>
          </Link>
        )}

        {/* Gazeta do Horizonte */}
        {latestJournal && (() => {
          const sections = latestJournal.sections as unknown as JournalSection[]
          const manchete = sections.find((s) => s.tipo === 'manchete')
          const dateStr = latestJournal.published_at
            ? new Date(latestJournal.published_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
              })
            : latestJournal.edition_date
          return (
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)]">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider">
                  Gazeta do Horizonte
                </h2>
                <span className="font-data text-[10px] text-[var(--text-label)] tracking-[0.15em] uppercase">
                  {dateStr}
                </span>
              </div>
              <ArkDivider variant="dark" className="mb-4" />
              {manchete && (
                <p className="font-display text-base text-[var(--text-primary)] mb-3 leading-snug">
                  {manchete.conteudo}
                </p>
              )}
              <Link
                href="/journal"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-body"
              >
                Ler edição completa &rarr;
              </Link>
            </div>
          )
        })()}

        {/* Eventos Recentes */}
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)]">
          <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            Eventos Recentes
          </h2>
          <ArkDivider variant="dark" className="mb-4" />
          {publicEvents && publicEvents.length > 0 ? (
            <ul className="space-y-3">
              {publicEvents.map((event) => (
                <li key={event.id} className="text-sm border-b border-[var(--ark-border)] pb-3 last:border-0">
                  <p className="text-[var(--text-secondary)] font-body">
                    {event.narrative_text ?? event.type}
                  </p>
                  <p className="text-[var(--text-label)] text-xs mt-1 font-data">
                    {new Date(event.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--text-label)] text-sm font-body italic">
              O mundo aguarda seus primeiros heróis.
            </p>
          )}
        </div>

      </div>
    </main>
  )
}

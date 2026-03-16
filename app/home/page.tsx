import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkButton from '@/components/ui/ArkButton'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import type { JournalSection } from '@/types'
import { getDailyTasks, updateLoginStreak } from '@/lib/game/daily'
import DailyTasksWidget from '@/components/dashboard/DailyTasksWidget'
import DailyChallengeWidget from '@/components/dashboard/DailyChallengeWidget'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level, status, xp, xp_to_next_level, avatar_url, races(name), classes(name)')
    .eq('user_id', user.id)
    .single()

  if (!character) redirect('/character/create')

  // Fetch all data in parallel
  const [
    { data: attrs },
    { data: wallet },
    { data: latestJournal },
    { data: activeExpedition },
    { count: unreadLetters },
    { data: recentNotifications },
    { count: unreadNotifCount },
  ] = await Promise.all([
    supabase
      .from('character_attributes')
      .select('hp_atual, hp_max, eter_atual, eter_max')
      .eq('character_id', character.id)
      .single(),
    supabase
      .from('character_wallet')
      .select('libras, essencia, premium_currency')
      .eq('character_id', character.id)
      .single(),
    supabase
      .from('journal_editions')
      .select('id, edition_date, sections, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('expeditions')
      .select('id, ends_at, risk_level, expedition_types(name, risk_level)')
      .eq('character_id', character.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('letters')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', character.id)
      .eq('is_read', false),
    supabase
      .from('notifications')
      .select('id, type, title, body, is_read, created_at')
      .eq('character_id', character.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('character_id', character.id)
      .eq('is_read', false),
  ])

  // Daily tasks + streak
  const [dailyData, streakData] = await Promise.all([
    getDailyTasks(character.id),
    updateLoginStreak(character.id),
  ])

  // Check active hunting
  let activeHunting: { id: string; kills: number; zoneName: string } | null = null
  const { data: huntingSession } = await supabase
    .from('hunting_sessions')
    .select('id, kills, hunting_zones(name)')
    .eq('character_id', character.id)
    .eq('status', 'active')
    .maybeSingle()
  if (huntingSession) {
    activeHunting = {
      id: huntingSession.id,
      kills: huntingSession.kills,
      zoneName: (huntingSession.hunting_zones as { name: string } | null)?.name ?? 'Zona desconhecida',
    }
  }

  const STATUS_LABELS: Record<string, string> = {
    active: 'Vivo', injured: 'Ferido', dead: 'Morto',
  }
  const STATUS_BADGE: Record<string, 'alive' | 'injured' | 'dead'> = {
    active: 'alive', injured: 'injured', dead: 'dead',
  }

  const hpPercent = attrs ? Math.round((attrs.hp_atual / attrs.hp_max) * 100) : 100
  const eterPercent = attrs ? Math.round((attrs.eter_atual / attrs.eter_max) * 100) : 100
  const xpPercent = character.xp_to_next_level > 0
    ? Math.round((character.xp / character.xp_to_next_level) * 100)
    : 100

  const expEnded = activeExpedition?.ends_at
    ? new Date(activeExpedition.ends_at) <= new Date()
    : false

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* ─── GRID LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: Character ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Avatar + Identity */}
          <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-[#6e160f]/30 border-2 border-[var(--ark-border-bright)] flex items-center justify-center text-2xl font-display font-bold text-[var(--text-primary)] overflow-hidden">
                {character.avatar_url ? (
                  <img src={character.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  character.name.charAt(0)
                )}
              </div>
              <div>
                <p className="text-lg font-display font-bold text-[var(--ark-gold-bright)]">{character.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[var(--text-secondary)] text-sm font-body">Nv {character.level}</span>
                  <span className="text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-label)] text-xs font-data">
                    {(character.races as { name: string } | null)?.name ?? '—'}
                    {' · '}
                    {(character.classes as { name: string } | null)?.name ?? '—'}
                  </span>
                </div>
                <ArkBadge color={STATUS_BADGE[character.status]} className="text-[9px] mt-1">
                  {STATUS_LABELS[character.status]}
                </ArkBadge>
              </div>
            </div>

            {/* XP Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] font-data text-[var(--text-label)] mb-1">
                <span>XP</span>
                <span>{character.xp} / {character.xp_to_next_level}</span>
              </div>
              <div className="h-1.5 bg-[var(--ark-bg)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--ark-amber)] rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
              </div>
            </div>

            {/* HP & Eter */}
            {attrs && (
              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex justify-between text-[10px] font-data text-[var(--text-label)] mb-0.5">
                    <span>HP</span>
                    <span>{attrs.hp_atual} / {attrs.hp_max}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--ark-bg)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--ark-red-glow)] rounded-full transition-all" style={{ width: `${hpPercent}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-data text-[var(--text-label)] mb-0.5">
                    <span>Éter</span>
                    <span>{attrs.eter_atual} / {attrs.eter_max}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--ark-bg)] rounded-full overflow-hidden">
                    <div className="h-full bg-gray-400 rounded-full transition-all" style={{ width: `${eterPercent}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Wallet */}
            {wallet && (
              <div className="flex gap-3 text-xs font-data pt-2 border-t border-[var(--ark-border)]">
                <span className="text-[var(--text-secondary)]">{wallet.libras} <span className="text-[var(--text-label)]">£</span></span>
                <span className="text-[var(--text-secondary)]">{wallet.essencia} <span className="text-[var(--text-label)]">Ess</span></span>
                <span className="text-[var(--text-secondary)]">{wallet.premium_currency} <span className="text-[var(--text-label)]">Gemas</span></span>
              </div>
            )}

            <Link href="/character" className="block mt-3">
              <ArkButton variant="secondary" size="sm" className="w-full">Ver Ficha</ArkButton>
            </Link>
          </div>
        </div>

        {/* ── CENTER COLUMN: Activities ── */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Activities */}
          {(activeExpedition || activeHunting) ? (
            <div className="space-y-3">
              {activeExpedition && (
                <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border border-[var(--ark-border)]">
                  <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Expedição Ativa</h3>
                  <p className="text-sm font-body text-[var(--text-primary)]">
                    {(activeExpedition.expedition_types as { name: string } | null)?.name ?? 'Expedição'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <ArkBadge color="crimson" className="text-[9px]">
                      {(activeExpedition.expedition_types as { risk_level: string } | null)?.risk_level ?? activeExpedition.risk_level}
                    </ArkBadge>
                    {expEnded ? (
                      <span className="text-[10px] font-data text-status-alive">Pronta para coleta</span>
                    ) : (
                      <span className="text-[10px] font-data text-[var(--text-label)]">
                        Até {new Date(activeExpedition.ends_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <Link href="/expeditions" className="block mt-2">
                    <ArkButton variant={expEnded ? 'primary' : 'secondary'} size="sm" className="w-full">
                      {expEnded ? 'Coletar' : 'Ver Expedição'}
                    </ArkButton>
                  </Link>
                </div>
              )}

              {activeHunting && (
                <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border border-[var(--ark-border)]">
                  <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Hunting Ativo</h3>
                  <p className="text-sm font-body text-[var(--text-primary)]">{activeHunting.zoneName}</p>
                  <p className="text-[10px] font-data text-[var(--text-label)] mt-1">{activeHunting.kills} kills</p>
                  <Link href="/battle" className="block mt-2">
                    <ArkButton variant="primary" size="sm" className="w-full">Continuar</ArkButton>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
              <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-3">O que fazer?</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/expeditions">
                  <ArkButton variant="secondary" size="sm" className="w-full">Expedição</ArkButton>
                </Link>
                <Link href="/battle">
                  <ArkButton variant="secondary" size="sm" className="w-full">Hunting</ArkButton>
                </Link>
                <Link href="/dungeon">
                  <ArkButton variant="secondary" size="sm" className="w-full">Dungeon</ArkButton>
                </Link>
                <Link href="/combat">
                  <ArkButton variant="secondary" size="sm" className="w-full">PvP</ArkButton>
                </Link>
              </div>
            </div>
          )}

          {/* Daily Tasks */}
          <DailyTasksWidget
            tasks={dailyData.tasks}
            completedCount={dailyData.completedCount}
            ticketGranted={dailyData.ticketGranted}
            characterId={character.id}
            streak={streakData.currentStreak}
          />

          {/* Daily Challenge */}
          <DailyChallengeWidget challenge={null} />
        </div>

        {/* ── RIGHT COLUMN: Journal & Notifications ── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Journal */}
          {latestJournal && (() => {
            const sections = latestJournal.sections as unknown as JournalSection[]
            const manchete = sections.find((s) => s.tipo === 'manchete')
            const dateStr = latestJournal.published_at
              ? new Date(latestJournal.published_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long',
                })
              : latestJournal.edition_date
            return (
              <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">
                    Gazeta do Horizonte
                  </h3>
                  <span className="font-data text-[10px] text-[var(--text-label)] tracking-[0.15em] uppercase">
                    {dateStr}
                  </span>
                </div>
                <ArkDivider variant="dark" className="mb-3" />
                {manchete && (
                  <p className="font-display text-sm text-[var(--text-primary)] mb-2 leading-snug line-clamp-3">
                    {manchete.conteudo}
                  </p>
                )}
                <Link
                  href="/journal"
                  className="text-[11px] font-data text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors tracking-wider uppercase"
                >
                  Ler edição completa →
                </Link>
              </div>
            )
          })()}

          {/* Notifications preview */}
          <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">
                Notificações
              </h3>
              {(unreadNotifCount ?? 0) > 0 && (
                <span className="text-[10px] font-data font-bold text-[var(--ark-red-glow)]">
                  {unreadNotifCount} não lida{(unreadNotifCount ?? 0) > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ArkDivider variant="dark" className="mb-3" />
            {recentNotifications && recentNotifications.length > 0 ? (
              <ul className="space-y-2">
                {recentNotifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ark-red-glow)] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-data font-semibold text-[var(--text-primary)]">{n.title}</p>
                      <p className="text-[11px] font-body text-[var(--text-secondary)] line-clamp-1">{n.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs font-body text-[var(--text-label)] italic">Nenhuma notificação.</p>
            )}
            <Link
              href="/notifications"
              className="block mt-3 text-[11px] font-data text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors tracking-wider uppercase"
            >
              Ver todas →
            </Link>
          </div>

          {/* Letters */}
          <Link href="/letters" className="block">
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-0.5">
                    Correspondência
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-body">
                    {(unreadLetters ?? 0) > 0
                      ? `${unreadLetters} carta${(unreadLetters ?? 0) > 1 ? 's' : ''} não lida${(unreadLetters ?? 0) > 1 ? 's' : ''}`
                      : 'Caixa vazia'}
                  </p>
                </div>
                {(unreadLetters ?? 0) > 0 && (
                  <span className="px-2 py-0.5 text-xs font-data font-bold bg-[var(--ark-red)]/40 text-[var(--ark-red-glow)] border border-[var(--ark-red)]/60 rounded">
                    {unreadLetters}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DungeonList from '@/components/dungeon/DungeonList'
import ArkDivider from '@/components/ui/ArkDivider'

export default async function DungeonsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level, recovery_until')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!character) redirect('/character/create')

  const isRecovering = character.recovery_until
    ? new Date(character.recovery_until) > new Date()
    : false

  const [
    { data: dungeonTypes },
    { data: activeParticipation },
    { data: history },
  ] = await Promise.all([
    // Tipos de dungeon ativos
    supabase
      .from('dungeon_types')
      .select('*')
      .eq('is_active', true)
      .order('difficulty'),

    // Sessao ativa do personagem
    supabase
      .from('dungeon_participants')
      .select('session_id, status, dungeon_sessions(id, status, difficulty, dungeon_types(name, difficulty))')
      .eq('character_id', character.id)
      .in('status', ['invited', 'ready', 'active'])
      .limit(1)
      .maybeSingle(),

    // Historico recente
    supabase
      .from('dungeon_rewards')
      .select('xp_granted, libras_granted, created_at, dungeon_sessions(result, difficulty, dungeon_types(name))')
      .eq('character_id', character.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Extrair sessao ativa se houver
  const activeSession = activeParticipation
    ? {
        sessionId: activeParticipation.session_id,
        participantStatus: activeParticipation.status as string,
        session: activeParticipation.dungeon_sessions as Record<string, unknown> | null,
      }
    : null

  return (
    <main className="min-h-screen relative">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[#6e160f]/6 blur-[160px] pointer-events-none" />

      <nav className="border-b border-[var(--ark-border)] px-6 py-3 flex items-center justify-between bg-[var(--ark-surface)] backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-3">
          <span className="font-display text-[var(--ark-red-glow)] text-lg">Dungeons</span>
          <span className="text-[var(--text-label)] text-sm font-body">— Arkandia</span>
        </div>
        <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-body">
          Dashboard
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        {/* Sessao ativa */}
        {activeSession && (
          <div className="mb-6">
            <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Dungeon Ativa
            </h2>
            <ArkDivider variant="dark" className="mb-4" />
            <Link
              href={`/dungeon/${activeSession.sessionId}`}
              className="block bg-[var(--ark-surface)] border border-[var(--ark-border-bright)] rounded-sm p-4 hover:bg-[var(--ark-surface-hover)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-display text-[var(--text-primary)]">
                    {(activeSession.session as Record<string, unknown>)?.dungeon_types
                      ? ((activeSession.session as Record<string, unknown>).dungeon_types as Record<string, unknown>)?.name as string
                      : 'Dungeon'}
                  </span>
                  <span className="text-[var(--text-label)] text-xs font-data ml-2">
                    {activeSession.participantStatus === 'invited' ? 'Convite pendente' :
                     activeSession.participantStatus === 'ready' ? 'Aguardando inicio' :
                     'Em andamento'}
                  </span>
                </div>
                <span className="text-[var(--ark-red-glow)] text-xs font-data">Entrar →</span>
              </div>
            </Link>
          </div>
        )}

        {/* Lista de dungeons */}
        <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          Dungeons Disponiveis
        </h2>
        <ArkDivider variant="dark" className="mb-4" />

        <DungeonList
          dungeonTypes={dungeonTypes ?? []}
          characterId={character.id}
          characterLevel={character.level}
          isRecovering={isRecovering}
          hasActiveSession={!!activeSession}
        />

        {/* Historico */}
        {history && history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Historico Recente
            </h2>
            <ArkDivider variant="dark" className="mb-4" />
            <div className="space-y-2">
              {history.map((entry, i) => {
                const ds = entry.dungeon_sessions as Record<string, unknown> | null
                const dt = ds?.dungeon_types as Record<string, unknown> | null
                return (
                  <div key={i} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-3 flex items-center justify-between text-xs font-data">
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-primary)]">{(dt?.name as string) ?? 'Dungeon'}</span>
                      <span className={`uppercase tracking-wider ${
                        ds?.result === 'success' ? 'text-status-alive' :
                        ds?.result === 'partial' ? 'text-[var(--ark-amber)]' :
                        'text-[var(--ark-red-glow)]'
                      }`}>{ds?.result as string ?? '?'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[var(--text-label)]">
                      <span>+{entry.xp_granted} XP</span>
                      <span>+{entry.libras_granted} Libras</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

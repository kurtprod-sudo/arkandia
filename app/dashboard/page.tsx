import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import ArkButton from '@/components/ui/ArkButton'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'

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
    .select('id, name, level, status, profession')
    .eq('user_id', user.id)
    .single()

  const { data: publicEvents } = await supabase
    .from('events')
    .select('id, type, narrative_text, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(10)

  const PROFESSION_LABELS: Record<string, string> = {
    comerciante: 'Comerciante', militar: 'Militar', clerigo: 'Clérigo',
    explorador: 'Explorador', artesao: 'Artesão', erudito: 'Erudito',
    nobre: 'Nobre', mercenario: 'Mercenário',
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
                  <ArkBadge color="bronze" className="text-[10px]">
                    {PROFESSION_LABELS[character.profession] ?? character.profession}
                  </ArkBadge>
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

        {/* World Journal */}
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)]">
          <h2 className="text-xs font-body text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            Jornal do Mundo
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

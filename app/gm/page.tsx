import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GMCharacterList from '@/components/gm/GMCharacterList'
import GMEventFeed from '@/components/gm/GMEventFeed'
import ArkDivider from '@/components/ui/ArkDivider'
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

  // Todos os personagens com atributos
  const { data: characters } = await supabase
    .from('characters')
    .select(`
      *,
      character_attributes (*),
      character_wallet (*)
    `)
    .order('created_at', { ascending: false })

  // Últimos 50 eventos
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <main className="min-h-screen relative">
      {/* Background glow — wine for GM authority */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-wine-dark/8 blur-[180px] pointer-events-none" />

      {/* GM Navbar */}
      <nav className="border-b border-wine-mid/30 px-6 py-3 flex items-center justify-between bg-wine-dark/10 backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-3">
          <span className="font-display text-wine-glow text-lg">GM Panel</span>
          <span className="text-ark-text-muted text-sm font-body">— Arkandia</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-bronze-light hover:text-bronze-glow transition-colors font-body">
            Dashboard
          </Link>
          <span className="text-wine-light text-sm font-data">{profile.username}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Character list — 2/3 */}
          <div className="xl:col-span-2">
            <h2 className="text-xs font-body text-ark-text-secondary uppercase tracking-wider mb-1">
              Personagens ({characters?.length ?? 0})
            </h2>
            <ArkDivider variant="dark" className="mb-4" />
            <GMCharacterList characters={(characters ?? []) as CharacterWithAttributes[]} />
          </div>

          {/* Event feed — 1/3 */}
          <div>
            <h2 className="text-xs font-body text-ark-text-secondary uppercase tracking-wider mb-1">
              Feed de Eventos (últimos 50)
            </h2>
            <ArkDivider variant="dark" className="mb-4" />
            <GMEventFeed events={(events ?? []) as GameEvent[]} />
          </div>
        </div>
      </div>
    </main>
  )
}

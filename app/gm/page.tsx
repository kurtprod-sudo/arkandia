import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GMCharacterList from '@/components/gm/GMCharacterList'
import GMEventFeed from '@/components/gm/GMEventFeed'
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
    <main className="min-h-screen bg-neutral-950 text-white">
      <nav className="border-b border-red-900 px-6 py-3 flex items-center justify-between bg-red-950/20">
        <div className="flex items-center gap-3">
          <span className="text-red-400 font-bold text-lg">GM Panel</span>
          <span className="text-neutral-500 text-sm">— Arkandia</span>
        </div>
        <span className="text-red-300 text-sm">{profile.username}</span>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Lista de personagens — ocupa 2/3 */}
          <div className="xl:col-span-2">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-4">
              Personagens ({characters?.length ?? 0})
            </h2>
            <GMCharacterList characters={(characters ?? []) as CharacterWithAttributes[]} />
          </div>

          {/* Feed de eventos — 1/3 */}
          <div>
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-4">
              Feed de Eventos (últimos 50)
            </h2>
            <GMEventFeed events={(events ?? []) as GameEvent[]} />
          </div>
        </div>
      </div>
    </main>
  )
}

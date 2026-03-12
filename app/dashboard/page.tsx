import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'

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

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-neutral-800 px-6 py-3 flex items-center justify-between">
        <span className="text-amber-400 font-bold text-lg">Arkandia</span>
        <div className="flex items-center gap-4">
          {profile?.role === 'gm' && (
            <Link href="/gm" className="text-sm text-red-400 hover:text-red-300">
              Painel GM
            </Link>
          )}
          <span className="text-neutral-400 text-sm">{profile?.username}</span>
          <form action={logout}>
            <button className="text-sm text-neutral-500 hover:text-white">
              Sair
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Personagem */}
        {character ? (
          <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-neutral-400 text-sm uppercase tracking-wide">
                Meu Personagem
              </h2>
              <Link
                href="/character"
                className="text-sm text-amber-400 hover:underline"
              >
                Ver ficha completa →
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-900/30 border-2 border-amber-700 flex items-center justify-center text-2xl font-bold text-amber-400">
                {character.name.charAt(0)}
              </div>
              <div>
                <p className="text-xl font-bold">{character.name}</p>
                <p className="text-neutral-400 text-sm">
                  Nível {character.level} • {character.status}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900 rounded-xl p-6 border border-amber-800 text-center">
            <p className="text-neutral-400 mb-3">Você ainda não criou seu personagem.</p>
            <Link
              href="/character/create"
              className="inline-block px-6 py-2 bg-amber-500 text-black font-bold rounded hover:bg-amber-400"
            >
              Criar Personagem
            </Link>
          </div>
        )}

        {/* Jornal do Mundo */}
        <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <h2 className="font-semibold text-neutral-400 text-sm uppercase tracking-wide mb-4">
            Jornal do Mundo
          </h2>
          {publicEvents && publicEvents.length > 0 ? (
            <ul className="space-y-3">
              {publicEvents.map((event) => (
                <li key={event.id} className="text-sm border-b border-neutral-800 pb-3 last:border-0">
                  <p className="text-neutral-300">
                    {event.narrative_text ?? event.type}
                  </p>
                  <p className="text-neutral-600 text-xs mt-1">
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
            <p className="text-neutral-600 text-sm">O mundo aguarda seus primeiros heróis.</p>
          )}
        </div>

      </div>
    </main>
  )
}

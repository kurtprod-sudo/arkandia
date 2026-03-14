import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkButton from '@/components/ui/ArkButton'
import ArkDivider from '@/components/ui/ArkDivider'

export default async function ScenariosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [{ data: scenarios }, { data: character }] = await Promise.all([
    supabase
      .from('social_scenarios')
      .select('*, scenario_presence(count)')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('characters')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return (
    <main className="min-h-screen relative bg-[var(--ark-void)]">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[var(--ark-red)]/8 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              Cenários Sociais
            </h1>
            <p className="text-sm text-[var(--text-label)] font-body mt-1">
              Espaços de interpretação in-character
            </p>
          </div>
          <Link href="/dashboard">
            <ArkButton variant="ghost" size="sm">&larr; Dashboard</ArkButton>
          </Link>
        </div>

        <ArkDivider variant="dark" />

        {!character ? (
          <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)] text-center">
            <p className="text-[var(--text-secondary)] mb-4 font-body">
              Crie um personagem para participar dos cenários.
            </p>
            <Link href="/character/create">
              <ArkButton>Criar Personagem</ArkButton>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(scenarios ?? []).map((scenario) => {
              const presenceArr = scenario.scenario_presence as { count: number }[]
              const currentCount = presenceArr?.[0]?.count ?? 0
              const isFull = currentCount >= scenario.max_players

              return (
                <div
                  key={scenario.id}
                  className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] transition-colors duration-200 flex flex-col"
                >
                  <p className="font-display text-base font-bold text-[var(--text-primary)] mb-1">
                    {scenario.name}
                  </p>
                  <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">
                    {scenario.location}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] font-body mb-4 flex-1">
                    {scenario.description.length > 100
                      ? scenario.description.slice(0, 100) + '…'
                      : scenario.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-data text-xs">
                      <span className={isFull ? 'text-[var(--ark-red-glow)]' : 'text-[var(--text-label)]'}>
                        {currentCount}
                      </span>
                      <span className="text-[var(--text-ghost)]"> / {scenario.max_players} presentes</span>
                    </span>

                    {isFull ? (
                      <ArkButton variant="secondary" size="sm" disabled>
                        Lotado
                      </ArkButton>
                    ) : (
                      <Link href={`/scenarios/${scenario.id}`}>
                        <ArkButton variant="primary" size="sm">
                          Entrar
                        </ArkButton>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {scenarios && scenarios.length === 0 && character && (
          <div className="text-center py-12">
            <p className="text-[var(--text-label)] text-sm font-body italic">
              Nenhum cenário ativo no momento.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

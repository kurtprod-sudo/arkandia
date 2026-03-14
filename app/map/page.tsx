import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import Link from 'next/link'
import ArkButton from '@/components/ui/ArkButton'

const CATEGORY_LABELS: Record<string, string> = {
  forja: 'Forja',
  arcano: 'Arcano',
  comercial: 'Comercial',
  militar: 'Militar',
  reliquia: 'Relíquia',
  estrategico: 'Estratégico',
}

interface TerritoryRow {
  id: string
  name: string
  region: string
  category: string
  controlling_society_id: string | null
  safezone_until: string | null
  base_production: Record<string, unknown>
  description: string
  societies: { name: string } | null
}

export default async function MapPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawTerritories } = await supabase
    .from('territories')
    .select('*, societies(name)')
    .order('region')

  const territories = (rawTerritories ?? []) as unknown as TerritoryRow[]

  // Agrupa por região
  const grouped: Record<string, TerritoryRow[]> = {}
  for (const t of territories) {
    if (!grouped[t.region]) grouped[t.region] = []
    grouped[t.region].push(t)
  }

  const now = new Date()

  return (
    <main className="min-h-screen relative bg-[var(--ark-void)]">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[var(--ark-red)]/6 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              Mapa Político de Arkandia
            </h1>
            <p className="text-sm text-[var(--text-label)] font-body mt-1">
              Estado atual dos territórios disputáveis
            </p>
          </div>
          <Link href="/dashboard">
            <ArkButton variant="ghost" size="sm">&larr; Dashboard</ArkButton>
          </Link>
        </div>

        <ArkDivider variant="dark" />

        {Object.entries(grouped).map(([region, regionTerritories]) => (
          <div key={region} className="space-y-3">
            <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
              {region}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regionTerritories.map((t) => {
                const hasSafezone = t.safezone_until && new Date(t.safezone_until) > now
                const librasPerHour = (t.base_production?.libras_per_hour as number) ?? 0

                return (
                  <div
                    key={t.id}
                    className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-display text-sm font-bold text-[var(--text-primary)]">
                        {t.name}
                      </p>
                      <ArkBadge color="bronze">
                        {CATEGORY_LABELS[t.category] ?? t.category}
                      </ArkBadge>
                    </div>

                    <p className="text-[10px] text-[var(--text-ghost)] font-body mb-2">
                      {t.description.length > 80
                        ? t.description.slice(0, 80) + '…'
                        : t.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {t.controlling_society_id ? (
                          <span className="font-data text-xs text-[var(--text-secondary)]">
                            {t.societies?.name ?? '???'}
                          </span>
                        ) : (
                          <span className="font-data text-xs text-[var(--text-ghost)] italic">
                            Sem controle
                          </span>
                        )}
                        {hasSafezone && (
                          <ArkBadge color="gold" className="text-[8px]">
                            Safezone
                          </ArkBadge>
                        )}
                      </div>
                      <span className="font-data text-[10px] text-[var(--text-ghost)]">
                        {librasPerHour} £/h
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {territories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-label)] text-sm font-body italic">
              Nenhum território registrado.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

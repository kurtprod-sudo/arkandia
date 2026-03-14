import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import SocietyActions from '@/components/society/SocietyActions'
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

export default async function SocietyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level, society_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!character) redirect('/character/create')

  // Se tem sociedade, busca dados completos
  let society: Record<string, unknown> | null = null
  let members: Array<Record<string, unknown>> = []
  let territories: Array<Record<string, unknown>> = []
  let myRole = 'member'

  if (character.society_id) {
    const [societyRes, membersRes, territoriesRes] = await Promise.all([
      supabase
        .from('societies')
        .select('*')
        .eq('id', character.society_id)
        .single(),
      supabase
        .from('society_members')
        .select('role, title, characters(id, name, level, classes(name))')
        .eq('society_id', character.society_id)
        .order('role'),
      supabase
        .from('territories')
        .select('*, territory_production(last_collected, reinvestment_level)')
        .eq('controlling_society_id', character.society_id),
    ])

    society = societyRes.data as Record<string, unknown> | null
    members = (membersRes.data ?? []) as Array<Record<string, unknown>>
    territories = (territoriesRes.data ?? []) as Array<Record<string, unknown>>

    const myMembership = members.find((m) => {
      const ch = m.characters as Record<string, unknown> | null
      return ch?.id === character.id
    })
    myRole = (myMembership?.role as string) ?? 'member'
  }

  // Se não tem sociedade, busca sociedades com recrutamento aberto
  let openSocieties: Array<Record<string, unknown>> = []
  if (!character.society_id) {
    const { data } = await supabase
      .from('societies')
      .select('id, name, description, level, recruitment_open, society_members(count)')
      .eq('recruitment_open', true)
      .is('dissolved_at', null)
      .order('name')
    openSocieties = (data ?? []) as Array<Record<string, unknown>>
  }

  return (
    <main className="min-h-screen relative bg-[var(--ark-void)]">
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[var(--ark-red)]/6 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              {character.society_id ? (society?.name as string) ?? 'Sociedade' : 'Sociedades'}
            </h1>
            <p className="text-sm text-[var(--text-label)] font-body mt-1">
              {character.society_id ? 'Painel da Sociedade' : 'Junte-se a uma Sociedade ou funde a sua'}
            </p>
          </div>
          <Link href="/dashboard">
            <ArkButton variant="ghost" size="sm">&larr; Dashboard</ArkButton>
          </Link>
        </div>

        <ArkDivider variant="dark" />

        {/* SEM SOCIEDADE */}
        {!character.society_id && (
          <div className="space-y-6">
            <SocietyActions
              characterId={character.id}
              characterLevel={character.level}
              hasSociety={false}
              myRole="none"
            />

            {openSocieties.length > 0 && (
              <>
                <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
                  Sociedades Recrutando
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {openSocieties.map((s) => {
                    const membersArr = s.society_members as { count: number }[]
                    const memberCount = membersArr?.[0]?.count ?? 0
                    return (
                      <div
                        key={s.id as string}
                        className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] transition-colors duration-200"
                      >
                        <p className="font-display text-base font-bold text-[var(--text-primary)] mb-1">
                          {s.name as string}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <ArkBadge color="bronze">Nv {s.level as number}</ArkBadge>
                          <span className="text-[10px] font-data text-[var(--text-ghost)]">
                            {memberCount} membros
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] font-body mb-3">
                          {((s.description as string) ?? '').slice(0, 120)}
                          {((s.description as string) ?? '').length > 120 ? '…' : ''}
                        </p>
                        <SocietyActions
                          characterId={character.id}
                          characterLevel={character.level}
                          hasSociety={false}
                          myRole="none"
                          joinSocietyId={s.id as string}
                        />
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {openSocieties.length === 0 && (
              <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)] text-center">
                <p className="text-sm text-[var(--text-label)] font-body italic">
                  Nenhuma Sociedade recrutando no momento.
                </p>
              </div>
            )}
          </div>
        )}

        {/* COM SOCIEDADE */}
        {character.society_id && society && (
          <div className="space-y-6">
            {/* Identity */}
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
              <div className="flex items-center gap-3 mb-3">
                <ArkBadge color="gold">Nível {society.level as number}</ArkBadge>
                <ArkBadge color="bronze">{myRole === 'leader' ? 'Líder' : myRole === 'officer' ? 'General' : 'Membro'}</ArkBadge>
              </div>
              {(society.manifesto as string | null) && (
                <p className="text-xs text-[var(--text-secondary)] font-body italic mt-2">
                  &ldquo;{society.manifesto as string}&rdquo;
                </p>
              )}
            </div>

            {/* Treasury & Tax */}
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
              <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
                Cofre e Impostos
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <span className="font-display text-xl font-bold text-[var(--text-primary)]">
                    {(society.treasury_libras as number).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs text-[var(--text-ghost)] font-data ml-1">Libras</span>
                </div>
                <div>
                  <span className="font-display text-xl font-bold text-[var(--text-primary)]">
                    {society.tax_percent as number}%
                  </span>
                  <span className="text-xs text-[var(--text-ghost)] font-data ml-1">Imposto</span>
                </div>
              </div>

              <SocietyActions
                characterId={character.id}
                characterLevel={character.level}
                hasSociety={true}
                myRole={myRole}
                societyId={character.society_id}
              />
            </div>

            {/* Territories */}
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
              <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
                Territórios Controlados ({territories.length})
              </p>
              {territories.length === 0 ? (
                <p className="text-xs text-[var(--text-ghost)] font-body italic">
                  Nenhum território sob controle.
                </p>
              ) : (
                <div className="space-y-3">
                  {territories.map((t) => {
                    const baseProduction = t.base_production as Record<string, unknown> | null
                    const librasPerHour = (baseProduction?.libras_per_hour as number) ?? 0
                    return (
                      <div key={t.id as string} className="flex items-center justify-between py-2 border-b border-[var(--ark-border)] last:border-0">
                        <div>
                          <p className="font-data text-sm text-[var(--text-primary)]">
                            {t.name as string}
                          </p>
                          <ArkBadge color="bronze" className="mt-1">
                            {CATEGORY_LABELS[(t.category as string)] ?? (t.category as string)}
                          </ArkBadge>
                        </div>
                        <span className="font-data text-xs text-[var(--text-label)]">
                          {librasPerHour} £/h
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Members */}
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
              <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
                Membros ({members.length})
              </p>
              <div className="space-y-2">
                {members.map((m) => {
                  const ch = m.characters as Record<string, unknown> | null
                  const className = ((ch?.classes as Record<string, unknown>)?.name as string) ?? ''
                  const role = m.role as string
                  const isLeader = role === 'leader'
                  return (
                    <div key={ch?.id as string} className="flex items-center justify-between py-1.5">
                      <div className="min-w-0">
                        <p className={`font-data text-sm truncate ${isLeader ? 'text-[var(--ark-gold-bright)]' : 'text-[var(--text-secondary)]'}`}>
                          {ch?.name as string}
                        </p>
                        <p className="text-[9px] font-data text-[var(--text-ghost)] truncate">
                          Nv {ch?.level as number} · {className || '—'}
                        </p>
                      </div>
                      <ArkBadge color={isLeader ? 'gold' : 'bronze'}>
                        {role === 'leader' ? 'Líder' : role === 'officer' ? 'General' : 'Membro'}
                      </ArkBadge>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Society actions (leave/dissolve) */}
            <div className="flex justify-end gap-3">
              <SocietyActions
                characterId={character.id}
                characterLevel={character.level}
                hasSociety={true}
                myRole={myRole}
                societyId={character.society_id}
                showLeaveDissolve
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

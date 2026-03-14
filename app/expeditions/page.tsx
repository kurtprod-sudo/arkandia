import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExpeditionActions from '@/components/character/ExpeditionActions'

export default async function ExpeditionsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: charCheck } = await supabase
    .from('characters')
    .select('id, injured_until')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!charCheck) redirect('/character/create')

  const characterId = charCheck.id

  const [
    { data: activeExpedition },
    { data: expeditionTypes },
  ] = await Promise.all([
    supabase
      .from('expeditions')
      .select('id, ends_at, expedition_types(name, subtype, risk_level, duration_hours)')
      .eq('character_id', characterId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('expedition_types')
      .select('id, name, subtype, risk_level, duration_hours, description')
      .eq('is_active', true)
      .order('risk_level'),
  ])

  // Check if character is injured
  const isInjured = charCheck.injured_until
    ? new Date(charCheck.injured_until) > new Date()
    : false
  const injuredUntilText = isInjured && charCheck.injured_until
    ? new Date(charCheck.injured_until).toLocaleString('pt-BR')
    : null

  // Transform active expedition data
  const activeExp = activeExpedition
    ? {
        id: activeExpedition.id,
        ends_at: activeExpedition.ends_at,
        expedition_types: activeExpedition.expedition_types as unknown as {
          name: string
          subtype: string
          risk_level: string
          duration_hours: number
        },
      }
    : null

  const types = (expeditionTypes ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    subtype: t.subtype,
    risk_level: t.risk_level,
    duration_hours: t.duration_hours,
    description: t.description,
  }))

  return (
    <main className="min-h-screen px-4 py-8 relative bg-[var(--ark-void)]">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[var(--ark-red)]/8 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[var(--ark-gold)]/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl text-[var(--text-primary)] mb-1">
            Expedições
          </h1>
          <p className="font-body text-sm text-[var(--text-secondary)]">
            {activeExp
              ? 'Uma expedição está em andamento.'
              : 'Escolha uma expedição e envie seu personagem.'}
          </p>
        </div>

        <ExpeditionActions
          characterId={characterId}
          activeExpedition={activeExp}
          expeditionTypes={types}
          isInjured={isInjured}
          injuredUntilText={injuredUntilText}
        />
      </div>
    </main>
  )
}

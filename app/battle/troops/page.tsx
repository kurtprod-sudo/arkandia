import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTroopStock, getCapacityLimit, processCompletedRecruitment, getRecruitmentQueue, TROOP_CONFIG } from '@/lib/game/troops'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import TroopRecruitButton from './TroopRecruitButton'
import TroopExpeditionForm from './TroopExpeditionForm'
import RecruitmentCountdown from './RecruitmentCountdown'

export default async function TroopsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) redirect('/character/create')

  // Process completed recruitment on load
  await processCompletedRecruitment(character.id)

  const [stock, capacity, queue, { data: wallet }] = await Promise.all([
    getTroopStock(character.id),
    getCapacityLimit(character.id),
    getRecruitmentQueue(character.id),
    supabase.from('character_wallet').select('libras').eq('character_id', character.id).single(),
  ])

  // Fetch troop expedition types
  const { data: troopExpTypes } = await supabase
    .from('expedition_types')
    .select('*')
    .eq('is_active', true)

  const troopExps = (troopExpTypes ?? []).filter((e) => {
    const sf = (e.success_formula as Record<string, unknown>) ?? {}
    return sf.troop_expedition === true
  })

  const TROOP_ICONS: Record<string, string> = {
    infantaria: '🗡️', arquearia: '🏹', cavalaria: '🐴', cerco: '🏰',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Tropas
      </h1>
      <ArkDivider variant="dark" />

      {/* SEÇÃO A — Estoque */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Estoque atual</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {(['infantaria', 'arquearia', 'cavalaria', 'cerco'] as const).map((tt) => (
            <div key={tt} className="bg-[var(--ark-bg)] rounded-sm p-3 border border-[var(--ark-border)] text-center">
              <span className="text-2xl">{TROOP_ICONS[tt]}</span>
              <p className="text-xs font-data font-semibold text-[var(--text-primary)] mt-1 capitalize">{tt}</p>
              <p className="text-lg font-display font-bold text-[var(--text-primary)]">{stock[tt]}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-data text-[var(--text-label)]">
          Capacidade por expedição: <span className="text-[var(--text-primary)]">{capacity}</span> unidades (Capitania × 10)
        </p>
      </div>

      {/* SEÇÃO B — Recrutamento */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Recrutamento</h2>
        <p className="text-[10px] font-data text-[var(--text-label)] mb-3">Saldo: {wallet?.libras ?? 0} Libras</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {(['infantaria', 'arquearia', 'cavalaria', 'cerco'] as const).map((tt) => {
            const cfg = TROOP_CONFIG[tt]
            return (
              <div key={tt} className="flex items-center justify-between p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                <div>
                  <p className="text-xs font-data font-semibold text-[var(--text-primary)] capitalize">{tt}</p>
                  <p className="text-[10px] font-data text-[var(--text-label)]">
                    {cfg.quantityPerLot} un · {cfg.librasCost}£ · {cfg.durationHours}h
                  </p>
                </div>
                <TroopRecruitButton troopType={tt} />
              </div>
            )
          })}
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div>
            <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Fila de recrutamento</p>
            <div className="space-y-1">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm text-xs">
                  <span className="font-data text-[var(--text-secondary)] capitalize">
                    {item.troopType} ×{item.quantity}
                  </span>
                  <RecruitmentCountdown endsAt={item.endsAt} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO C — Expedições com tropas */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Expedições com Tropas</h2>
        {troopExps.length > 0 ? (
          <div className="space-y-4">
            {troopExps.map((exp) => {
              const sf = (exp.success_formula as Record<string, unknown>) ?? {}
              const resistanceType = (sf.resistance_type as string) ?? 'infantaria'
              const MIN_LVL: Record<string, number> = { moderado: 5, perigoso: 8, extremo: 12 }
              return (
                <div key={exp.id} className="p-4 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-data font-semibold text-[var(--text-primary)]">{exp.name}</h3>
                    <ArkBadge color="crimson" className="text-[9px]">{exp.risk_level}</ArkBadge>
                  </div>
                  <p className="text-[10px] font-data text-[var(--text-label)] mb-1">
                    Duração: {exp.duration_hours}h · Nível mín: {MIN_LVL[exp.risk_level] ?? 1} · Resistência: <span className="capitalize text-[var(--text-secondary)]">{resistanceType}</span>
                  </p>
                  <TroopExpeditionForm
                    expeditionTypeId={exp.id}
                    resistanceType={resistanceType}
                    stock={stock}
                    capacity={capacity}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs font-body text-[var(--text-label)] italic">Nenhuma expedição com tropas disponível.</p>
        )}
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveWorldEvents, getWorldEventHistory } from '@/lib/game/world_events'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'

const TYPE_LABELS: Record<string, string> = {
  monolito: 'Monólito', invasao_faccao: 'Invasão', passagem_imperador: 'Imperador',
  torneio: 'Torneio', crise_politica: 'Crise Política', catalogo_lendario: 'Catálogo Lendário',
}
const TYPE_COLORS: Record<string, 'gold' | 'crimson' | 'archetype' | 'alive' | 'injured' | 'bronze'> = {
  monolito: 'gold', invasao_faccao: 'crimson', passagem_imperador: 'archetype',
  torneio: 'bronze', crise_politica: 'injured', catalogo_lendario: 'alive',
}

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [active, history] = await Promise.all([
    getActiveWorldEvents(),
    getWorldEventHistory(20),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Eventos de Mundo
      </h1>
      <ArkDivider variant="dark" />

      {active.length > 0 ? (
        <div className="space-y-3">
          {active.map((e) => (
            <div key={e.id} className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border-bright)]">
              <div className="flex items-center gap-2 mb-2">
                <ArkBadge color={TYPE_COLORS[e.type] ?? 'bronze'} className="text-[9px]">
                  {TYPE_LABELS[e.type] ?? e.type}
                </ArkBadge>
                <ArkBadge color="alive" className="text-[8px]">Ativo</ArkBadge>
              </div>
              <h2 className="text-sm font-display font-bold text-[var(--text-primary)]">{e.title}</h2>
              <p className="text-xs font-body text-[var(--text-secondary)] mt-1 leading-relaxed">{e.description}</p>
              <p className="text-[10px] font-data text-[var(--text-label)] mt-2">
                Desde {new Date(e.startsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--ark-surface)] rounded-sm p-8 border border-[var(--ark-border)] text-center">
          <p className="text-sm font-body text-[var(--text-label)]">Nenhum evento ativo no momento.</p>
          <p className="text-xs font-body text-[var(--text-ghost)] mt-1">Eventos são anunciados no Jornal do Mundo.</p>
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">Histórico</h2>
          <div className="space-y-2">
            {history.map((e) => (
              <div key={e.id} className="bg-[var(--ark-surface)] rounded-sm p-3 border border-[var(--ark-border)] opacity-60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArkBadge color={TYPE_COLORS[e.type] ?? 'bronze'} className="text-[8px]">{TYPE_LABELS[e.type] ?? e.type}</ArkBadge>
                  <span className="text-xs font-data text-[var(--text-secondary)]">{e.title}</span>
                </div>
                <span className="text-[10px] font-data text-[var(--text-ghost)]">
                  {e.endsAt ? new Date(e.endsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

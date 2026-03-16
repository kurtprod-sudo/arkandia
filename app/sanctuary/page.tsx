import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveSeason } from '@/lib/game/seasonal'
import ArkButton from '@/components/ui/ArkButton'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import { Sparkles, ShoppingBag, Gem } from 'lucide-react'

export default async function SanctuaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) redirect('/character/create')

  const [
    { data: wallet },
    activeSeason,
    { data: catalogs },
  ] = await Promise.all([
    supabase.from('character_wallet')
      .select('premium_currency, summon_tickets')
      .eq('character_id', character.id).single(),
    getActiveSeason(),
    supabase.from('summon_catalogs').select('*').eq('is_active', true),
  ])

  const gemas = wallet?.premium_currency ?? 0
  const tickets = wallet?.summon_tickets ?? 0

  const seasonalItems = activeSeason
    ? ((activeSeason.seasonal_legendaries ?? []) as Array<{
        id: string; price_gemas: number; purchased_by: string | null
        maestrias: Record<string, unknown> | null
      }>)
    : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Santuário
      </h1>
      <ArkDivider variant="dark" />

      {/* Saldo */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm font-data">
          <Gem size={14} className="text-[var(--ark-gold-bright)]" />
          <span className="text-[var(--text-primary)]">{gemas}</span>
          <span className="text-[var(--text-label)]">Gemas</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-data">
          <Sparkles size={14} className="text-[var(--ark-amber)]" />
          <span className="text-[var(--text-primary)]">{tickets}</span>
          <span className="text-[var(--text-label)]">Tickets</span>
        </div>
        <Link href="/shop" className="ml-auto">
          <ArkButton variant="secondary" size="sm">Comprar Gemas</ArkButton>
        </Link>
      </div>

      {/* Caixa do Viajante */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-[var(--ark-gold-bright)]" />
          <h2 className="text-xs font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Caixa do Viajante
          </h2>
        </div>
        {catalogs && catalogs.length > 0 ? (
          <div className="grid gap-3">
            {catalogs.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                <div>
                  <p className="text-sm font-data font-semibold text-[var(--text-primary)]">{cat.name}</p>
                  <p className="text-[11px] font-body text-[var(--text-label)] mt-0.5">{cat.description}</p>
                  <p className="text-[10px] font-data text-[var(--text-ghost)] mt-1">
                    {cat.cost_gemas} Gemas ou 1 Ticket · Pity: {cat.pity_threshold} pulls
                  </p>
                </div>
                <Link href="/summon">
                  <ArkButton size="sm">Invocar</ArkButton>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-body text-[var(--text-label)] italic">Nenhum catálogo ativo no momento.</p>
        )}
      </div>

      {/* Vitrine Sazonal */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={18} className="text-[var(--ark-gold-bright)]" />
          <h2 className="text-xs font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Vitrine Sazonal de Lendárias
          </h2>
        </div>

        {activeSeason ? (
          <>
            <div className="mb-4">
              <p className="text-sm font-display font-bold text-[var(--ark-gold-bright)]">
                {(activeSeason as Record<string, unknown>).name as string}
              </p>
              <p className="text-[11px] font-body text-[var(--text-secondary)] mt-0.5">
                {(activeSeason as Record<string, unknown>).theme as string}
              </p>
              <p className="text-[10px] font-data text-[var(--text-label)] mt-1">
                Até {new Date((activeSeason as Record<string, unknown>).ends_at as string).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long',
                })}
              </p>
            </div>

            <div className="grid gap-3">
              {seasonalItems.map((si) => {
                const maestria = si.maestrias as Record<string, unknown> | null
                const isPurchased = !!si.purchased_by
                return (
                  <div key={si.id} className={`p-4 border rounded-sm ${isPurchased ? 'border-[var(--text-ghost)]/20 opacity-50' : 'border-[var(--ark-gold)]/30 bg-[var(--ark-bg)]'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-data font-semibold text-[var(--text-primary)]">
                          {(maestria?.name as string) ?? 'Maestria'}
                        </p>
                        <p className="text-[11px] font-body text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                          {(maestria?.description as string) ?? ''}
                        </p>
                        <p className="text-xs font-data text-[var(--ark-gold-bright)] mt-1">
                          {si.price_gemas} Gemas
                        </p>
                      </div>
                      <ArkBadge color={isPurchased ? 'bronze' : 'gold'} className="text-[9px] shrink-0">
                        {isPurchased ? 'Adquirida' : 'Disponível'}
                      </ArkBadge>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-xs font-body text-[var(--text-label)] italic">
            Nenhuma temporada ativa no momento.
          </p>
        )}
      </div>
    </div>
  )
}

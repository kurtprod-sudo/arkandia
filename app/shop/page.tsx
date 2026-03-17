import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import ShopPanel from '@/components/shop/ShopPanel'

const PACKS = [
  { label: 'Pacote Iniciante', gemas: 100, price: 'R$ 10,00', tag: null },
  { label: 'Pacote Aventureiro', gemas: 300, price: 'R$ 28,00', tag: 'Popular' },
  { label: 'Pacote Veterano', gemas: 650, price: 'R$ 55,00', tag: null },
  { label: 'Pacote Lendário', gemas: 1500, price: 'R$ 120,00', tag: 'Melhor valor' },
] as const

export default async function ShopPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!character) redirect('/dashboard')

  const [
    { data: wallet },
    { data: pendingPayment },
    { data: activeSeason },
  ] = await Promise.all([
    supabase
      .from('character_wallet')
      .select('premium_currency')
      .eq('character_id', character.id)
      .single(),
    supabase
      .from('payments')
      .select('id, qr_code, qr_code_base64, ticket_url, expires_at, gemas_amount, amount_brl')
      .eq('character_id', character.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle(),
    supabase
      .from('seasons')
      .select('id, name, theme, ends_at, seasonal_legendaries(id, price_gemas, purchased_by, maestrias(name, description))')
      .eq('is_active', true)
      .maybeSingle(),
  ])

  const pendingPaymentData = pendingPayment
    ? {
        id: pendingPayment.id,
        qrCode: pendingPayment.qr_code ?? undefined,
        qrCodeBase64: pendingPayment.qr_code_base64 ?? undefined,
        ticketUrl: pendingPayment.ticket_url ?? undefined,
        expiresAt: pendingPayment.expires_at,
        gemasAmount: pendingPayment.gemas_amount,
        amountBrl: Number(pendingPayment.amount_brl),
      }
    : undefined

  const seasonalItems = activeSeason
    ? ((activeSeason.seasonal_legendaries ?? []) as Array<{
        id: string; price_gemas: number; purchased_by: string | null
        maestrias: { name: string; description: string } | null
      }>)
    : []

  return (
    <main className="min-h-screen bg-[var(--ark-void)] text-[var(--text-primary)]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-[var(--ark-gold-bright)]">
            Loja
          </h1>
          <span className="font-data text-sm text-[var(--text-secondary)]">
            {wallet?.premium_currency ?? 0} Gemas
          </span>
        </div>
        <ArkDivider variant="dark" />

        {/* Pacotes sugeridos */}
        <section>
          <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
            Pacotes de Gemas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {PACKS.map((pack) => (
              <div key={pack.label} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 relative">
                {pack.tag && (
                  <span className="absolute top-2 right-2 text-[8px] font-data text-[var(--ark-gold-bright)] border border-[var(--ark-gold)]/40 px-1.5 py-0.5 rounded-sm">
                    {pack.tag}
                  </span>
                )}
                <p className="text-sm font-data font-semibold text-[var(--text-primary)]">{pack.label}</p>
                <p className="text-xl font-display font-bold text-[var(--ark-gold-bright)] mt-1">{pack.gemas}</p>
                <p className="text-[10px] font-data text-[var(--text-label)]">Gemas</p>
                <p className="text-xs font-data text-[var(--text-secondary)] mt-1">{pack.price}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Compra personalizada via PIX */}
        <section>
          <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
            Comprar Gemas — PIX
          </h2>
          <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-5">
            <ShopPanel
              characterId={character.id}
              pendingPayment={pendingPaymentData}
            />
          </div>
        </section>

        {/* Vitrine Sazonal de Lendárias */}
        {activeSeason && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
                Maestrias Lendárias — {(activeSeason as Record<string, unknown>).theme as string}
              </h2>
              <span className="text-[9px] font-data text-[var(--text-ghost)]">
                Até {new Date((activeSeason as Record<string, unknown>).ends_at as string).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </span>
            </div>
            <div className="space-y-3">
              {seasonalItems.length === 0 && (
                <p className="text-xs font-body text-[var(--text-ghost)] italic">
                  Nenhuma Maestria Lendária disponível nesta temporada.
                </p>
              )}
              {seasonalItems.map((si) => {
                const m = si.maestrias
                const isPurchased = !!si.purchased_by
                return (
                  <div key={si.id} className={`p-4 border rounded-sm ${isPurchased ? 'opacity-40 border-[var(--ark-border)]' : 'border-[var(--ark-gold)]/30 bg-[var(--ark-bg)]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-data font-semibold text-[var(--text-primary)]">{m?.name ?? 'Maestria'}</p>
                        <p className="text-[11px] font-body text-[var(--text-secondary)] mt-0.5 line-clamp-2">{m?.description ?? ''}</p>
                        <p className="text-xs font-data text-[var(--ark-gold-bright)] mt-1">{si.price_gemas} Gemas</p>
                      </div>
                      {isPurchased ? (
                        <span className="text-[9px] font-data text-[var(--text-ghost)] shrink-0">Adquirida</span>
                      ) : (
                        <Link href="/sanctuary">
                          <span className="text-[10px] font-data text-[var(--ark-red-glow)] hover:underline shrink-0">Adquirir →</span>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[9px] font-data text-[var(--text-ghost)] mt-2 text-center">
              Maestrias Lendárias são esgotáveis — quando alguém adquire, saem do catálogo.
            </p>
          </section>
        )}

        {/* Nota */}
        <p className="text-[10px] font-data text-[var(--text-ghost)] text-center">
          R$ 1,00 = 10 Gemas · Pagamento via PIX · Gemas não expiram
        </p>
      </div>
    </main>
  )
}

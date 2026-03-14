import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShopPanel from '@/components/shop/ShopPanel'

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

  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('premium_currency')
    .eq('character_id', character.id)
    .single()

  // Verifica se já tem pagamento pendente
  const { data: pendingPayment } = await supabase
    .from('payments')
    .select('id, qr_code, qr_code_base64, ticket_url, expires_at, gemas_amount, amount_brl')
    .eq('character_id', character.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  return (
    <main className="min-h-screen bg-[var(--ark-void)] text-[var(--text-primary)]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-[var(--ark-gold-bright)]">
            Loja de Gemas
          </h1>
          <span className="font-data text-sm text-[var(--text-secondary)]">
            Saldo: {wallet?.premium_currency ?? 0} Gemas
          </span>
        </div>

        <ShopPanel
          characterId={character.id}
          pendingPayment={
            pendingPayment
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
          }
        />
      </div>
    </main>
  )
}

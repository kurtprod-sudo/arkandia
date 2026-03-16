import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import { Sparkles, ShoppingBag } from 'lucide-react'

export default async function SanctuaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()

  let gemas = 0
  let tickets = 0
  if (character) {
    const { data: wallet } = await supabase
      .from('character_wallet')
      .select('premium_currency, summon_tickets')
      .eq('character_id', character.id)
      .single()
    gemas = wallet?.premium_currency ?? 0
    tickets = wallet?.summon_tickets ?? 0
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Santuário
      </h1>
      <ArkDivider variant="dark" className="mb-4" />

      {/* Saldo */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm font-data text-[var(--text-secondary)]">
          <span className="text-[var(--text-label)]">Gemas:</span> {gemas}
        </div>
        <div className="flex items-center gap-2 text-sm font-data text-[var(--text-secondary)]">
          <span className="text-[var(--text-label)]">Tickets:</span> {tickets}
        </div>
      </div>

      <div className="grid gap-3">
        <Link href="/summon">
          <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] transition-colors flex items-center gap-4">
            <Sparkles size={22} className="text-[var(--text-label)] shrink-0" />
            <div>
              <p className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider">Caixa do Viajante</p>
              <p className="text-xs font-body text-[var(--text-secondary)] mt-0.5">Summon de materiais, equipamentos e consumíveis.</p>
            </div>
          </div>
        </Link>

        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)] flex items-center gap-4 opacity-50">
          <ShoppingBag size={22} className="text-[var(--text-label)] shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider">Vitrine Sazonal</p>
              <ArkBadge color="bronze" className="text-[8px]">Em breve</ArkBadge>
            </div>
            <p className="text-xs font-body text-[var(--text-secondary)] mt-0.5">Maestrias Lendárias sazonais com preço fixo.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

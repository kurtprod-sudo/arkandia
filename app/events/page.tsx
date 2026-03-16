import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import { Calendar } from 'lucide-react'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Eventos
      </h1>
      <ArkDivider variant="dark" className="mb-6" />

      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-8 border border-[var(--ark-border)] text-center">
        <Calendar size={32} className="text-[var(--text-label)] mx-auto mb-3" />
        <p className="text-sm font-body text-[var(--text-secondary)]">
          Nenhum evento ativo no momento.
        </p>
        <p className="text-xs font-body text-[var(--text-label)] mt-2">
          Eventos de mundo são ativados pelo GM e aparecem no Jornal do Mundo.
        </p>
      </div>
    </div>
  )
}

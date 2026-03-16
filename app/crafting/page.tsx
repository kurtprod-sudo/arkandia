import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import { Hammer, Package } from 'lucide-react'

export default async function CraftingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sections = [
    { label: 'Oficina de Crafting', href: '/market', icon: Hammer, description: 'Combine materiais para criar equipamentos e consumíveis.' },
    { label: 'Inventário', href: '/character', icon: Package, description: 'Veja seus itens, materiais e equipamentos na ficha.' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Crafting
      </h1>
      <ArkDivider variant="dark" className="mb-6" />
      <div className="grid gap-3">
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.label} href={s.href}>
              <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] transition-colors flex items-center gap-4">
                <Icon size={22} className="text-[var(--text-label)] shrink-0" />
                <div>
                  <p className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider">{s.label}</p>
                  <p className="text-xs font-body text-[var(--text-secondary)] mt-0.5">{s.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-6 bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <p className="text-xs font-body text-[var(--text-label)] italic text-center">
          Sistema de crafting completo em desenvolvimento. Use a Oficina no Bazaar por enquanto.
        </p>
      </div>
    </div>
  )
}

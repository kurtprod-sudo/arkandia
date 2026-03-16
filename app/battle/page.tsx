import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import { Target, Compass, Users, Swords, BookOpen, Trophy, Shield } from 'lucide-react'

export default async function BattlePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sections = [
    { label: 'Hunting', href: '/hunting', icon: Target, description: 'Entre em zonas de caça e enfrente NPCs em combate sequencial.' },
    { label: 'Expedições', href: '/expeditions', icon: Compass, description: 'Envie seu personagem em expedições idle e colete recompensas.' },
    { label: 'Dungeons', href: '/dungeon', icon: Users, description: 'Monte um grupo e enfrente dungeons em combate por turnos.' },
    { label: 'Combate PvP', href: '/combat', icon: Swords, description: 'Desafie outros jogadores para duelos em tempo real.' },
    { label: 'Tropas', href: '/battle/troops', icon: Shield, description: 'Recrute tropas e envie expedições com exército.' },
    { label: 'Torneios', href: '/tournament', icon: Trophy, description: 'Torneios eliminatórios organizados pelo GM com premiação.' },
    { label: 'Campanha', href: '/battle', icon: BookOpen, description: 'Missões narrativas da Campanha Inicial. Em breve.' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Batalha
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
    </div>
  )
}

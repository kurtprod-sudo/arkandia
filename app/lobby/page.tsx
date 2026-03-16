import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import { MessageCircle, Mail, BookOpen } from 'lucide-react'

export default async function LobbyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const sections = [
    { label: 'Cenários', href: '/scenarios', icon: MessageCircle, description: 'Entre em cenários sociais para roleplay com outros jogadores.' },
    { label: 'Correspondência', href: '/letters', icon: Mail, description: 'Envie e receba cartas como seu personagem.' },
    { label: 'Diário', href: character ? `/diary/${character.id}` : '/lobby', icon: BookOpen, description: 'Escreva no Diário de Bordo e o mundo responde.' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Lobby
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

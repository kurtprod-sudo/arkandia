import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'

const TYPE_LABELS: Record<string, string> = {
  expedition_done:    'Expedição',
  duel_received:      'Duelo',
  letter_received:    'Carta',
  dungeon_invite:     'Dungeon',
  society_invite:     'Sociedade',
  war_declared:       'Guerra',
  level_up:           'Level Up',
  hunting_done:       'Hunting',
  resonance_unlocked: 'Ressonância',
  general:            'Geral',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!character) redirect('/character/create')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('character_id', character.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Notificações
      </h1>
      <ArkDivider variant="dark" className="mb-4" />

      {notifications && notifications.length > 0 ? (
        <ul className="space-y-1">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`
                flex items-start gap-3 px-4 py-3 rounded-sm border transition-colors
                ${n.is_read
                  ? 'border-transparent opacity-60'
                  : 'border-[var(--ark-border)] bg-[var(--ark-surface)]'
                }
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {!n.is_read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ark-red-glow)] shrink-0" />
                  )}
                  <span className="text-xs font-data font-semibold text-[var(--text-primary)]">
                    {n.title}
                  </span>
                  <ArkBadge color="bronze" className="text-[8px] ml-auto">
                    {TYPE_LABELS[n.type] ?? n.type}
                  </ArkBadge>
                </div>
                <p className="text-[11px] font-body text-[var(--text-secondary)]">{n.body}</p>
                <span className="text-[10px] font-data text-[var(--text-label)] mt-1 block">
                  {new Date(n.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-[var(--text-label)] text-sm font-body italic py-12">
          Nenhuma notificação registrada.
        </p>
      )}
    </div>
  )
}

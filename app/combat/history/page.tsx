import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'

const MODALITY_LABELS: Record<string, string> = {
  duelo_livre:      'Duelo Livre',
  duelo_ranqueado:  'Duelo Ranqueado',
  emboscada:        'Emboscada',
  torneio:          'Torneio',
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

export default async function CombatHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!character) redirect('/character/create')

  const { data: sessions } = await supabase
    .from('combat_sessions')
    .select(`
      id, modality, status, winner_id, finished_at, created_at,
      challenger:characters!combat_sessions_challenger_id_fkey(id, name, level),
      defender:characters!combat_sessions_defender_id_fkey(id, name, level)
    `)
    .or(`challenger_id.eq.${character.id},defender_id.eq.${character.id}`)
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
    .limit(30)

  const history = (sessions ?? []).map((s) => {
    const challenger = s.challenger as Record<string, unknown>
    const defender = s.defender as Record<string, unknown>
    const isChallenger = challenger?.id === character.id
    const opponent = isChallenger ? defender : challenger
    const won = s.winner_id === character.id

    return {
      id: s.id as string,
      modality: s.modality as string,
      opponentName: (opponent?.name as string) ?? '?',
      opponentLevel: (opponent?.level as number) ?? 1,
      won,
      finishedAt: s.finished_at as string | null,
    }
  })

  const wins = history.filter((h) => h.won).length
  const losses = history.length - wins

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Histórico de Combate
        </h1>
        <Link href="/battle" className="text-xs font-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          ← Combate
        </Link>
      </div>
      <ArkDivider variant="dark" className="mb-6" />

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 text-center">
          <p className="text-2xl font-display font-bold text-status-alive">{wins}</p>
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mt-1">Vitórias</p>
        </div>
        <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 text-center">
          <p className="text-2xl font-display font-bold text-[var(--ark-red-glow)]">{losses}</p>
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mt-1">Derrotas</p>
        </div>
      </div>

      {/* Lista */}
      {history.length === 0 ? (
        <p className="text-xs font-body text-[var(--text-ghost)] italic text-center py-8">
          Nenhum combate registrado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <div
              key={h.id}
              className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <ArkBadge color={h.won ? 'alive' : 'dead'} className="text-[9px] shrink-0">
                  {h.won ? 'Vitória' : 'Derrota'}
                </ArkBadge>
                <div>
                  <p className="text-xs font-data font-semibold text-[var(--text-primary)]">
                    vs {h.opponentName}
                  </p>
                  <p className="text-[10px] font-data text-[var(--text-label)]">
                    Nv {h.opponentLevel} · {MODALITY_LABELS[h.modality] ?? h.modality}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-data text-[var(--text-ghost)] shrink-0">
                {timeAgo(h.finishedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

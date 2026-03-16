import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateMirror, getAvailableOpponents, getColiseuTier, getChallengeExtraCost } from '@/lib/game/coliseu'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import ColiseuChallengeButton from './ColiseuChallengeButton'
import ColiseuCountdown from './ColiseuCountdown'

const TIER_COLORS: Record<string, 'bronze' | 'alive' | 'gold' | 'archetype' | 'crimson'> = {
  Iniciante: 'bronze', Guerreiro: 'alive', Veterano: 'alive', Elite: 'archetype', Lendário: 'gold',
}

export default async function ColiseuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters').select('id, name').eq('user_id', user.id).single()
  if (!character) redirect('/character/create')

  const [mirror, opponents] = await Promise.all([
    getOrCreateMirror(character.id),
    getAvailableOpponents(character.id),
  ])

  const tier = getColiseuTier(mirror.coliseuPoints)
  const today = new Date().toISOString().split('T')[0]
  const used = mirror.lastChallengeDate === today ? mirror.dailyChallengesUsed : 0
  const nextCost = getChallengeExtraCost(used)

  // Season
  const { data: season } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .from('coliseu_seasons').select('ends_at').eq('status', 'active').single()

  // Ranking top 10
  const { data: ranking } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (k: string, o: Record<string, boolean>) => { limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }> } } } })
    .from('character_mirrors').select('character_id, coliseu_points, wins, losses, characters(name)').order('coliseu_points', { ascending: false }).limit(10)

  // History
  const { data: history } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { or: (f: string) => { order: (k: string, o: Record<string, boolean>) => { limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }> } } } } })
    .from('coliseu_challenges').select('id, result, points_delta, created_at, challenger_id, defender_mirror_id').or(`challenger_id.eq.${character.id},defender_mirror_id.eq.${character.id}`).order('created_at', { ascending: false }).limit(10)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">Coliseu</h1>
      <ArkDivider variant="dark" />

      {/* SEÇÃO A — Seu Espelho */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <ArkBadge color={TIER_COLORS[tier] ?? 'bronze'} className="text-[9px]">{tier}</ArkBadge>
            <p className="text-lg font-display font-bold text-[var(--text-primary)] mt-1">{mirror.coliseuPoints} pts</p>
          </div>
          <div className="text-right text-xs font-data text-[var(--text-label)]">
            <p>{mirror.wins}V / {mirror.losses}D</p>
            <p className="mt-1">{5 - used}/5 gratuitos{nextCost > 0 && <span className="text-[var(--ark-gold-bright)]"> · Extra: {nextCost}G</span>}</p>
          </div>
        </div>
        <ColiseuCountdown label="Reset diário" targetIso={new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z').getTime() + 86400000} />
      </div>

      {/* SEÇÃO B — Adversários */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Adversários</h2>
        {opponents.length > 0 ? (
          <div className="space-y-2">
            {opponents.map((o) => {
              const oTier = getColiseuTier(o.coliseuPoints)
              const estDelta = o.coliseuPoints - mirror.coliseuPoints >= 200 ? '+35' : o.coliseuPoints - mirror.coliseuPoints <= -200 ? '+15' : '+25'
              return (
                <div key={o.characterId} className="flex items-center justify-between p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                  <div>
                    <span className="text-xs font-data font-semibold text-[var(--text-primary)]">{o.characterName}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ArkBadge color={TIER_COLORS[oTier] ?? 'bronze'} className="text-[7px]">{oTier}</ArkBadge>
                      <span className="text-[10px] font-data text-[var(--text-label)]">{o.coliseuPoints} pts</span>
                      <span className="text-[10px] font-data text-status-alive">{estDelta} pts</span>
                    </div>
                  </div>
                  <ColiseuChallengeButton defenderCharacterId={o.characterId} />
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs font-body text-[var(--text-label)] italic">Nenhum adversário disponível no range.</p>
        )}
      </div>

      {/* SEÇÃO C — Ranking */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">Ranking da Quinzena</h2>
          {season && <ColiseuCountdown label="Fim" targetIso={new Date(season.ends_at as string).getTime()} />}
        </div>
        <div className="space-y-1">
          {(ranking ?? []).map((r, i) => {
            const name = ((r.characters as Record<string, unknown>)?.name as string) ?? '?'
            const pts = r.coliseu_points as number
            const isMe = r.character_id === character.id
            const posColor = i === 0 ? 'text-[var(--ark-gold-bright)]' : i <= 2 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-label)]'
            return (
              <div key={r.character_id as string} className={`flex items-center justify-between p-2 rounded-sm ${isMe ? 'bg-[var(--ark-gold)]/5 border border-[var(--ark-gold)]/20' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-data font-bold w-6 ${posColor}`}>#{i + 1}</span>
                  <span className="text-xs font-data text-[var(--text-primary)]">{name}</span>
                </div>
                <span className="text-xs font-data text-[var(--text-label)]">{pts} pts</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* SEÇÃO D — Histórico */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Histórico</h2>
        {(history ?? []).length > 0 ? (
          <div className="space-y-1">
            {(history ?? []).map((h) => {
              const isChallenger = (h.challenger_id as string) === character.id
              const result = h.result as string
              const delta = h.points_delta as number
              const displayResult = isChallenger ? result : (result === 'win' ? 'loss' : result === 'loss' ? 'win' : 'draw')
              const displayDelta = isChallenger ? delta : -delta
              return (
                <div key={h.id as string} className="flex items-center justify-between p-2 text-xs">
                  <span className={`font-data ${displayResult === 'win' ? 'text-status-alive' : displayResult === 'loss' ? 'text-[var(--ark-red-glow)]' : 'text-[var(--text-label)]'}`}>
                    {displayResult === 'win' ? '✓' : displayResult === 'loss' ? '✗' : '='} {displayResult}
                  </span>
                  <span className={`font-data ${displayDelta >= 0 ? 'text-status-alive' : 'text-[var(--ark-red-glow)]'}`}>
                    {displayDelta >= 0 ? `+${displayDelta}` : displayDelta}
                  </span>
                  <span className="font-data text-[var(--text-ghost)]">
                    {new Date(h.created_at as string).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs font-body text-[var(--text-label)] italic">Nenhum desafio registrado.</p>
        )}
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBossWithContribution, startBossAttack } from '@/lib/game/world_boss'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import BossArena from '@/components/boss/BossArena'
import BossClaimButton from './BossClaimButton'

export default async function BossPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) redirect('/character/create')

  const { boss, contribution, ranking } = await getBossWithContribution(character.id)

  // Check if player wants to start attack (via searchParams in future — for now show state)
  const searchParams = new URL('http://x').searchParams // placeholder — real impl uses page props

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Boss de Mundo
      </h1>
      <ArkDivider variant="dark" />

      {!boss && (
        <div className="bg-[var(--ark-surface)] rounded-sm p-8 border border-[var(--ark-border)] text-center">
          <p className="text-sm font-body text-[var(--text-label)]">Nenhum boss ativo no momento.</p>
          <p className="text-xs font-body text-[var(--text-ghost)] mt-1">O Boss de Mundo surge toda sexta-feira.</p>
        </div>
      )}

      {boss && boss.status === 'active' && (
        <>
          <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-red)]/30">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">{boss.name}</h2>
              <ArkBadge color="crimson" className="text-[9px]">ATIVO</ArkBadge>
            </div>
            {boss.loreText && <p className="text-xs font-body text-[var(--text-secondary)] italic mb-3">{boss.loreText}</p>}
            <div className="mb-2">
              <div className="flex justify-between text-[10px] font-data text-[var(--text-label)] mb-0.5">
                <span>HP Global</span>
                <span>{boss.hpCurrent.toLocaleString()} / {boss.hpMax.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-[var(--ark-bg)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--ark-red-glow)] rounded-full transition-all"
                  style={{ width: `${(boss.hpCurrent / boss.hpMax) * 100}%` }} />
              </div>
            </div>
            <div className="flex gap-4 text-xs font-data text-[var(--text-label)]">
              <span>Seu dano: {contribution?.damageDealt?.toLocaleString() ?? '0'}</span>
              <span>Ataques hoje: {contribution?.attacksToday ?? 0}/3</span>
            </div>
          </div>

          {/* Ranking */}
          {ranking.length > 0 && (
            <div className="bg-[var(--ark-surface)] rounded-sm p-4 border border-[var(--ark-border)]">
              <h3 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Top Contribuidores</h3>
              {ranking.map((r) => (
                <div key={r.rank} className="flex items-center justify-between text-xs py-1">
                  <span className="font-data text-[var(--text-primary)]">#{r.rank} {r.characterName}</span>
                  <span className="font-data text-[var(--text-label)]">{r.damageDealt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {boss && (boss.status === 'defeated' || boss.status === 'expired') && (
        <div className="bg-[var(--ark-surface)] rounded-sm p-5 border border-[var(--ark-border)]">
          <h2 className="text-lg font-display font-bold text-[var(--text-primary)] mb-2">
            {boss.status === 'defeated' ? 'Boss Derrotado!' : 'Janela encerrada'}
          </h2>
          <p className="text-xs font-data text-[var(--text-label)]">
            Seu dano: {contribution?.damageDealt?.toLocaleString() ?? '0'}
          </p>
          {contribution && !contribution.rewardClaimed && (contribution.damageDealt ?? 0) > 0 && (
            <BossClaimButton bossId={boss.id} />
          )}
          {contribution?.rewardClaimed && (
            <p className="text-xs font-data text-status-alive mt-2">Recompensa coletada.</p>
          )}
        </div>
      )}
    </div>
  )
}

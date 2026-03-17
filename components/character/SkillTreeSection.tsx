'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkBadge from '@/components/ui/ArkBadge'
import ArkButton from '@/components/ui/ArkButton'

interface SkillTreeSkill {
  id: string
  name: string
  description: string
  skill_type: string
  tree_position: number
  eter_cost: number
  range_state: string
  is_starting_skill: boolean
}

interface Props {
  characterId: string
  classSkillTree: SkillTreeSkill[]
  acquiredSkillIds: string[]
  essencia: number
  costMap: Record<number, number>
}

const SKILL_TYPE_BADGE: Record<string, 'crimson' | 'gold' | 'bronze'> = {
  ativa: 'crimson', passiva: 'gold', reativa: 'bronze',
}

export default function SkillTreeSection({
  characterId,
  classSkillTree,
  acquiredSkillIds: initialAcquired,
  essencia: initialEssencia,
  costMap,
}: Props) {
  const router = useRouter()
  const [acquiredIds, setAcquiredIds] = useState(new Set(initialAcquired))
  const [essencia, setEssencia] = useState(initialEssencia)
  const [loadingSkill, setLoadingSkill] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy(skillId: string, cost: number) {
    setLoadingSkill(skillId)
    setError(null)
    try {
      const res = await fetch('/api/character/skills/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, skill_id: skillId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erro ao adquirir skill.')
      } else {
        setAcquiredIds((prev) => new Set([...Array.from(prev), skillId]))
        setEssencia((prev) => prev - cost)
        router.refresh()
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoadingSkill(null)
    }
  }

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
          Árvore de Skills
        </h2>
        <span className="text-[10px] font-data text-[var(--text-ghost)]">
          {acquiredIds.size}/8 adquiridas · {essencia} Essências
        </span>
      </div>

      {error && (
        <p className="text-[10px] font-body text-[var(--ark-red-glow)] mb-2">{error}</p>
      )}

      <div className="space-y-2">
        {classSkillTree.map((skill) => {
          const cost = costMap[skill.tree_position] ?? 0
          const owned = acquiredIds.has(skill.id)
          const isLoading = loadingSkill === skill.id
          const canAfford = essencia >= cost

          return (
            <div
              key={skill.id}
              className={`p-3 rounded-sm border transition-colors ${
                owned
                  ? 'border-[var(--ark-border-bright)] bg-[var(--ark-accent)]/5'
                  : 'border-[var(--ark-border)] bg-[var(--ark-bg)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-data text-[var(--text-ghost)]">
                      #{skill.tree_position}
                    </span>
                    <span className="text-xs font-data font-semibold text-[var(--text-primary)] truncate">
                      {skill.name}
                    </span>
                    <ArkBadge color={SKILL_TYPE_BADGE[skill.skill_type] ?? 'bronze'} className="text-[7px]">
                      {skill.skill_type}
                    </ArkBadge>
                    {owned && (
                      <span className="text-[9px] font-data text-status-alive">✓ Adquirida</span>
                    )}
                    {skill.is_starting_skill && !owned && (
                      <span className="text-[9px] font-data text-[var(--text-ghost)] italic">inicial</span>
                    )}
                  </div>
                  <p className="text-[10px] font-body text-[var(--text-label)] mt-0.5 line-clamp-2">
                    {skill.description}
                  </p>
                  {skill.eter_cost > 0 && (
                    <p className="text-[9px] font-data text-attr-eter mt-0.5">
                      {skill.eter_cost} Éter · {skill.range_state}
                    </p>
                  )}
                </div>
              </div>

              {!owned && !skill.is_starting_skill && (
                <div className="mt-2">
                  <ArkButton
                    variant="secondary"
                    onClick={() => handleBuy(skill.id, cost)}
                    disabled={isLoading || !canAfford}
                    className="text-[10px] py-1 px-3"
                  >
                    {isLoading ? 'Adquirindo...' : `Adquirir — ${cost} Essência`}
                  </ArkButton>
                  {!canAfford && (
                    <p className="text-[10px] font-data text-[var(--text-ghost)] mt-1">
                      Essência insuficiente ({essencia}/{cost})
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {acquiredIds.size >= 8 && (
        <p className="text-[10px] font-data text-[var(--ark-gold-bright)] text-center mt-3">
          ✦ Árvore completa — Maestrias desbloqueadas
        </p>
      )}
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Swords, CheckCircle, Lock, Shield, BookOpen, Star } from 'lucide-react'
import type { CampaignStage, LoreFragment } from '@/types'
import { startStageCombatAction } from '@/app/actions/campaign_long'

interface StageWithStatus extends CampaignStage {
  normalCompleted: boolean
  hardCompleted: boolean
  hardAvailable: boolean
}

interface Props {
  chapters: Array<{
    chapterNumber: number
    nation: string
    title: string
    stages: StageWithStatus[]
  }>
  loreFragments: LoreFragment[]
}

const CHAPTER_TITLES: Record<number, string> = {
  1: 'Sombras de Valoria',
  2: 'O Véu de Eryuell',
  3: 'A Chama de Düren',
}

export default function AventuraChapterTabs({ chapters, loreFragments }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [showLore, setShowLore] = useState(false)

  const currentChapter = chapters.find((c) => c.chapterNumber === activeTab)

  async function handleCombat(stageNumber: number, difficulty: 'normal' | 'hard') {
    setError(null)
    startTransition(async () => {
      const res = await startStageCombatAction('aventura', activeTab, stageNumber, difficulty)
      if (!res.success) {
        setError(res.error ?? 'Erro ao iniciar combate.')
      } else if (res.sessionId) {
        router.push(`/combat?session=${res.sessionId}`)
      }
    })
  }

  // Group lore by nation
  const loreByNation: Record<string, LoreFragment[]> = {}
  for (const frag of loreFragments) {
    if (!loreByNation[frag.nation]) loreByNation[frag.nation] = []
    loreByNation[frag.nation].push(frag)
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--ark-border)]">
        {[1, 2, 3].map((ch) => {
          const chData = chapters.find((c) => c.chapterNumber === ch)
          const stagesNormal = chData?.stages.filter((s) => s.normalCompleted).length ?? 0
          return (
            <button
              key={ch}
              onClick={() => setActiveTab(ch)}
              className={`px-4 py-2 text-xs font-data font-semibold uppercase tracking-wider transition border-b-2 ${
                activeTab === ch
                  ? 'border-[var(--ark-accent)] text-[var(--ark-accent)]'
                  : 'border-transparent text-[var(--text-label)] hover:text-[var(--text-primary)]'
              }`}
            >
              Cap. {ch} ({stagesNormal}/10)
            </button>
          )
        })}
      </div>

      {/* Chapter header */}
      {currentChapter && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-data font-semibold text-[var(--ark-accent)] uppercase">
            Capítulo {currentChapter.chapterNumber}
          </span>
          <span className="text-sm font-display font-bold text-[var(--text-primary)]">
            {CHAPTER_TITLES[currentChapter.chapterNumber] ?? currentChapter.title}
          </span>
          <span className="text-xs font-body text-[var(--text-label)] ml-auto">
            {currentChapter.nation.charAt(0).toUpperCase() + currentChapter.nation.slice(1)}
          </span>
        </div>
      )}

      {/* Stages grid */}
      {currentChapter && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {currentChapter.stages.map((stage) => {
            const isNormalAvail = !stage.normalCompleted && (
              stage.stageNumber === 1 ||
              currentChapter.stages.some((s) => s.stageNumber === stage.stageNumber - 1 && s.normalCompleted)
            )

            return (
              <div
                key={stage.id}
                className={`rounded-sm border p-3 text-center space-y-1 ${
                  stage.normalCompleted
                    ? 'border-green-700/50 bg-green-900/10'
                    : isNormalAvail
                      ? 'border-[var(--ark-accent)]/50 bg-[var(--ark-accent)]/5'
                      : 'border-[var(--ark-border)] bg-[var(--ark-bg)] opacity-50'
                }`}
              >
                {/* Stage number + status */}
                <div className="flex items-center justify-center gap-1">
                  {stage.normalCompleted ? (
                    <CheckCircle size={12} className="text-green-400" />
                  ) : isNormalAvail ? (
                    <Swords size={12} className="text-[var(--ark-accent)]" />
                  ) : (
                    <Lock size={12} className="text-[var(--text-label)]" />
                  )}
                  <span className="text-xs font-data font-bold text-[var(--text-primary)]">
                    {stage.stageNumber}
                  </span>
                </div>

                {/* Title */}
                <p className="text-[10px] font-data text-[var(--text-secondary)] truncate">
                  {stage.title}
                </p>

                {/* NPC recurrence badge */}
                {stage.npcKey && (
                  <span className="text-[8px] font-body text-amber-400">Reencontro</span>
                )}

                {/* Normal combat button */}
                {isNormalAvail && !stage.normalCompleted && (
                  <button
                    onClick={() => handleCombat(stage.stageNumber, 'normal')}
                    disabled={isPending}
                    className="w-full mt-1 px-2 py-1 bg-[var(--ark-accent)]/20 border border-[var(--ark-accent)]/40 text-[var(--ark-accent)] text-[10px] font-data font-semibold uppercase rounded-sm hover:bg-[var(--ark-accent)]/30 transition disabled:opacity-50"
                  >
                    Combater
                  </button>
                )}

                {/* Hard mode indicators */}
                {stage.normalCompleted && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {stage.hardCompleted ? (
                      <Star size={10} className="text-purple-400" fill="currentColor" />
                    ) : stage.hardAvailable ? (
                      <button
                        onClick={() => handleCombat(stage.stageNumber, 'hard')}
                        disabled={isPending}
                        className="px-2 py-0.5 bg-purple-900/30 border border-purple-700/40 text-purple-300 text-[9px] font-data font-semibold uppercase rounded-sm hover:bg-purple-900/50 transition disabled:opacity-50"
                      >
                        <Shield size={8} className="inline mr-0.5" />
                        Difícil
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <p className="text-xs font-body text-red-400">{error}</p>
      )}

      {/* Lore Fragments accordion */}
      <div className="mt-6">
        <button
          onClick={() => setShowLore(!showLore)}
          className="flex items-center gap-2 text-xs font-data font-semibold text-[var(--text-label)] uppercase tracking-wider hover:text-[var(--text-primary)] transition"
        >
          <BookOpen size={14} />
          Fragmentos de Lore ({loreFragments.length})
          <span className="text-[var(--text-label)]">{showLore ? '▼' : '▶'}</span>
        </button>

        {showLore && (
          <div className="mt-3 space-y-4">
            {Object.entries(loreByNation).map(([nation, frags]) => (
              <div key={nation}>
                <h4 className="text-xs font-data font-semibold text-[var(--text-primary)] uppercase mb-2">
                  {nation.charAt(0).toUpperCase() + nation.slice(1)}
                </h4>
                <div className="space-y-2">
                  {frags.map((frag) => (
                    <div
                      key={frag.fragmentKey}
                      className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-3"
                    >
                      <p className="text-xs font-data font-semibold text-[var(--ark-accent)]">
                        {frag.title}
                      </p>
                      <p className="text-xs font-body text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {frag.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {loreFragments.length === 0 && (
              <p className="text-xs font-body text-[var(--text-label)] italic">
                Nenhum fragmento desbloqueado ainda. Complete fases para descobrir a história de Arkandia.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

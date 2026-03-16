'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Swords, CheckCircle, Lock, ChevronRight } from 'lucide-react'
import type { CampaignChapter, CampaignProgress, CampaignChoiceOption } from '@/types'
import {
  startCampaignAction,
  makeChapterChoiceAction,
  startChapterCombatAction,
  completeChapterAction,
} from '@/app/actions/campaign'

interface Props {
  chapters: CampaignChapter[]
  progress: CampaignProgress | null
  campaignSlug: string
}

export default function CampaignPanel({ chapters, progress, campaignSlug }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [narrativeResult, setNarrativeResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentChapter = progress?.currentChapter ?? 0
  const isStarted = !!progress
  const isCompleted = progress?.completed ?? false

  async function handleStart() {
    setError(null)
    startTransition(async () => {
      const res = await startCampaignAction(campaignSlug)
      if (!res.success) setError(res.error ?? 'Erro ao iniciar.')
      else router.refresh()
    })
  }

  async function handleChoice(choiceIndex: number) {
    setError(null)
    setNarrativeResult(null)
    startTransition(async () => {
      const res = await makeChapterChoiceAction(campaignSlug, choiceIndex)
      if (!res.success) setError(res.error ?? 'Erro.')
      else {
        setNarrativeResult(res.narrativeResult ?? null)
        router.refresh()
      }
    })
  }

  async function handleCombat() {
    setError(null)
    startTransition(async () => {
      const res = await startChapterCombatAction(campaignSlug)
      if (!res.success) setError(res.error ?? 'Erro ao iniciar combate.')
      else if (res.sessionId) {
        router.push(`/combat?session=${res.sessionId}`)
      }
    })
  }

  async function handleAdvance() {
    setError(null)
    setNarrativeResult(null)
    startTransition(async () => {
      const res = await completeChapterAction(campaignSlug)
      if (!res.success) setError(res.error ?? 'Erro ao avançar.')
      else router.refresh()
    })
  }

  if (!isStarted) {
    return (
      <div className="text-center py-8">
        <BookOpen size={32} className="text-[var(--text-label)] mx-auto mb-3" />
        <p className="text-xs font-body text-[var(--text-secondary)] mb-4">
          Sua jornada em Ellia aguarda. Comece a Campanha Inicial.
        </p>
        <button
          onClick={handleStart}
          disabled={isPending}
          className="px-6 py-2 bg-[var(--ark-accent)] text-[var(--ark-bg)] text-xs font-data font-semibold uppercase tracking-wider rounded-sm hover:brightness-110 transition disabled:opacity-50"
        >
          {isPending ? 'Iniciando...' : 'Iniciar Campanha'}
        </button>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="space-y-3">
        <div className="bg-[var(--ark-surface)] border border-[var(--ark-accent)]/30 rounded-sm p-4 text-center">
          <CheckCircle size={24} className="text-[var(--ark-accent)] mx-auto mb-2" />
          <p className="text-sm font-display font-bold text-[var(--ark-accent)] uppercase">Campanha Concluída</p>
          <p className="text-xs font-body text-[var(--text-secondary)] mt-1">
            Sua lenda em Ellia está apenas começando.
          </p>
        </div>
        <ChapterTimeline chapters={chapters} currentChapter={11} choices={progress?.chapterChoices ?? {}} />
      </div>
    )
  }

  const activeChapter = chapters.find((c) => c.chapterNumber === currentChapter)
  const hasChoices = activeChapter?.choices && activeChapter.choices.length > 0
  const choiceMade = progress?.chapterChoices[String(currentChapter)] !== undefined
  const hasCombat = activeChapter?.hasCombat ?? false
  const hasCombatSession = !!progress?.combatSessionId

  // Determine if chapter can be advanced
  const canAdvance = (() => {
    if (!activeChapter) return false
    if (hasChoices && !choiceMade) return false
    if (hasCombat && !hasCombatSession) return false
    return true
  })()

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <ChapterTimeline chapters={chapters} currentChapter={currentChapter} choices={progress?.chapterChoices ?? {}} />

      {/* Active chapter card */}
      {activeChapter && (
        <div className="bg-[var(--ark-surface)] border border-[var(--ark-border-bright)] rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-data font-semibold text-[var(--ark-accent)] uppercase">
              Cap. {activeChapter.chapterNumber}
            </span>
            <span className="text-sm font-display font-bold text-[var(--text-primary)]">
              {activeChapter.title}
            </span>
          </div>

          <p className="text-xs font-body text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
            {activeChapter.narrativeText}
          </p>

          {/* Rewards preview */}
          <div className="flex gap-4 text-xs font-data text-[var(--text-label)]">
            {activeChapter.xpReward > 0 && <span>+{activeChapter.xpReward} XP</span>}
            {activeChapter.librasReward > 0 && <span>+{activeChapter.librasReward} Libras</span>}
            {activeChapter.unlocksResonance && (
              <span className="text-[var(--ark-accent)]">Desbloqueia Ressonância</span>
            )}
          </div>

          {/* Narrative result */}
          {narrativeResult && (
            <div className="bg-[var(--ark-bg)] border border-[var(--ark-accent)]/20 rounded-sm p-3">
              <p className="text-xs font-body text-[var(--text-primary)] italic">{narrativeResult}</p>
            </div>
          )}

          {/* Choice buttons */}
          {hasChoices && !choiceMade && (
            <div className="space-y-2">
              <p className="text-xs font-data font-semibold text-[var(--text-label)] uppercase tracking-wider">
                Escolha seu caminho:
              </p>
              {(activeChapter.choices as CampaignChoiceOption[]).map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChoice(idx)}
                  disabled={isPending}
                  className="w-full text-left px-4 py-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm hover:border-[var(--ark-border-bright)] transition disabled:opacity-50"
                >
                  <span className="text-xs font-data font-semibold text-[var(--text-primary)]">
                    {choice.label}
                  </span>
                  {choice.reputation_faction && (
                    <span className="block text-xs font-body text-[var(--text-label)] mt-0.5">
                      +{choice.reputation_delta} rep ({choice.reputation_faction})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Choice already made */}
          {hasChoices && choiceMade && (
            <div className="text-xs font-body text-[var(--text-label)] italic">
              Escolha realizada.
            </div>
          )}

          {/* Combat button */}
          {hasCombat && !hasCombatSession && (
            <button
              onClick={handleCombat}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/40 border border-red-700/50 text-red-300 text-xs font-data font-semibold uppercase tracking-wider rounded-sm hover:bg-red-900/60 transition disabled:opacity-50"
            >
              <Swords size={14} />
              {isPending ? 'Iniciando...' : `Enfrentar ${activeChapter.npcName ?? 'Inimigo'}`}
            </button>
          )}

          {/* Combat in progress */}
          {hasCombat && hasCombatSession && (
            <button
              onClick={() => router.push(`/combat?session=${progress?.combatSessionId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-900/40 border border-amber-700/50 text-amber-300 text-xs font-data font-semibold uppercase tracking-wider rounded-sm hover:bg-amber-900/60 transition"
            >
              <Swords size={14} />
              Continuar Combate
            </button>
          )}

          {/* Advance button */}
          <button
            onClick={handleAdvance}
            disabled={isPending || !canAdvance}
            className="flex items-center gap-2 px-5 py-2 bg-[var(--ark-accent)] text-[var(--ark-bg)] text-xs font-data font-semibold uppercase tracking-wider rounded-sm hover:brightness-110 transition disabled:opacity-40"
          >
            <ChevronRight size={14} />
            {isPending ? 'Avançando...' : currentChapter >= chapters.length ? 'Concluir Campanha' : 'Avançar Capítulo'}
          </button>

          {error && (
            <p className="text-xs font-body text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline sub-component
// ---------------------------------------------------------------------------

function ChapterTimeline({
  chapters,
  currentChapter,
  choices,
}: {
  chapters: CampaignChapter[]
  currentChapter: number
  choices: Record<string, number>
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2">
      {chapters.map((ch) => {
        const isDone = ch.chapterNumber < currentChapter
        const isCurrent = ch.chapterNumber === currentChapter
        const isLocked = ch.chapterNumber > currentChapter
        const hasChoice = choices[String(ch.chapterNumber)] !== undefined

        return (
          <div
            key={ch.id}
            className={`shrink-0 w-20 rounded-sm p-2 border text-center transition ${
              isCurrent
                ? 'border-[var(--ark-accent)] bg-[var(--ark-accent)]/10'
                : isDone
                  ? 'border-[var(--ark-border-bright)] bg-[var(--ark-surface)]'
                  : 'border-[var(--ark-border)] bg-[var(--ark-bg)] opacity-50'
            }`}
          >
            <div className="flex items-center justify-center mb-1">
              {isDone ? (
                <CheckCircle size={12} className="text-green-400" />
              ) : isLocked ? (
                <Lock size={12} className="text-[var(--text-label)]" />
              ) : (
                <BookOpen size={12} className="text-[var(--ark-accent)]" />
              )}
            </div>
            <p className="text-[10px] font-data font-semibold text-[var(--text-primary)] truncate">
              {ch.chapterNumber}. {ch.title}
            </p>
            {ch.hasCombat && (
              <Swords size={10} className="text-red-400 mx-auto mt-0.5" />
            )}
            {hasChoice && isDone && (
              <span className="text-[8px] text-[var(--text-label)]">escolha</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import { generateDailyChallengeAction, acceptDailyChallengeAction } from '@/app/actions/daily_challenge'

interface Props {
  challenge: {
    id: string
    npcSnapshot: { name: string; challengePhrase: string }
    combatSessionId: string | null
    completed: boolean
    won: boolean | null
    currentStreak: number
  } | null
}

export default function DailyChallengeWidget({ challenge: initialChallenge }: Props) {
  const router = useRouter()
  const [challenge, setChallenge] = useState(initialChallenge)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    const res = await generateDailyChallengeAction()
    if (res.success && res.challenge) {
      setChallenge({
        id: res.challenge.id,
        npcSnapshot: res.challenge.npcSnapshot,
        combatSessionId: res.challenge.combatSessionId,
        completed: res.challenge.completed,
        won: res.challenge.won,
        currentStreak: res.challenge.currentStreak,
      })
    }
    setLoading(false)
  }

  const handleAccept = async () => {
    if (!challenge) return
    setLoading(true)
    const res = await acceptDailyChallengeAction(challenge.id)
    if (res.success && res.sessionId) {
      router.push('/combat')
    }
    setLoading(false)
  }

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
      <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
        Desafio Diário
      </h3>

      {!challenge && (
        <div className="text-center">
          <p className="text-xs font-body text-[var(--text-secondary)] mb-3">Um oponente aguarda você.</p>
          <ArkButton size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Gerando...' : 'Ver Desafio do Dia'}
          </ArkButton>
        </div>
      )}

      {challenge && !challenge.completed && (
        <div>
          <p className="text-sm font-display font-bold text-[var(--text-primary)]">{challenge.npcSnapshot.name}</p>
          <p className="text-xs font-body text-[var(--text-secondary)] mt-1 italic">
            &ldquo;{challenge.npcSnapshot.challengePhrase}&rdquo;
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] font-data text-[var(--text-label)]">
              Streak: {challenge.currentStreak} {challenge.currentStreak % 7 === 6 ? '(próximo: +1 Ticket!)' : ''}
            </span>
            <ArkButton size="sm" onClick={handleAccept} disabled={loading}>
              {loading ? 'Preparando...' : 'Aceitar Desafio'}
            </ArkButton>
          </div>
        </div>
      )}

      {challenge && challenge.completed && (
        <div>
          <p className="text-sm font-display font-bold text-[var(--text-primary)]">{challenge.npcSnapshot.name}</p>
          <p className={`text-xs font-data mt-1 ${challenge.won ? 'text-status-alive' : 'text-[var(--ark-red-glow)]'}`}>
            {challenge.won ? 'Vitória — +150 Libras' : 'Derrota — sem recompensa'}
          </p>
          <p className="text-[10px] font-data text-[var(--text-label)] mt-1">
            Streak: {challenge.currentStreak} · Próximo desafio à meia-noite UTC
          </p>
        </div>
      )}
    </div>
  )
}

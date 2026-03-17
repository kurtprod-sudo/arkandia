'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ArkButton from '@/components/ui/ArkButton'
import UseItemButton from './UseItemButton'
import ArkStatBar from '@/components/ui/ArkStatBar'

const TURN_TIMER_SECONDS = 60

interface CombatPlayer {
  id: string
  name: string
  level: number
  className: string
  hpAtual: number
  hpMax: number
  eterAtual: number
  eterMax: number
}

interface BuildingSlot {
  slot: number
  skillId: string | null
  skill: {
    id: string
    name: string
    skill_type: string
    eter_cost: number
    range_state: string
    description: string
  } | null
}

interface TurnLog {
  turnNumber: number
  actorId: string
  actionType: string
  damageDealt: number
  narrativeText: string
}

interface SessionData {
  status: string
  currentTurn: number
  activePlayerId: string | null
  turnExpiresAt: string | null
  winnerId: string | null
  modality: string
  challengerId: string
  defenderId: string
}

interface CombatArenaProps {
  sessionId: string
  session: SessionData
  challenger: CombatPlayer
  defender: CombatPlayer
  myCharacterId: string
  building: BuildingSlot[]
  initialTurns: TurnLog[]
}

const MODALITY_LABELS: Record<string, string> = {
  duelo_livre: 'Duelo Livre',
  duelo_ranqueado: 'Duelo Ranqueado',
  emboscada: 'Emboscada',
  torneio: 'Torneio',
}

const DEFEAT_ESSENCIA_LOSS: Record<string, number> = {
  duelo_livre: 0,
  duelo_ranqueado: 10,
  emboscada: 20,
  torneio: 10,
}

const DEFEAT_RECOVERY_HOURS: Record<string, number> = {
  duelo_livre: 0,
  duelo_ranqueado: 2,
  emboscada: 4,
  torneio: 1,
}

export default function CombatArena({
  sessionId,
  session: initialSession,
  challenger: initialChallenger,
  defender: initialDefender,
  myCharacterId,
  building,
  initialTurns,
}: CombatArenaProps) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [challengerHp, setChallengerHp] = useState(initialChallenger.hpAtual)
  const [defenderHp, setDefenderHp] = useState(initialDefender.hpAtual)
  const [challengerEter, setChallengerEter] = useState(initialChallenger.eterAtual)
  const [defenderEter, setDefenderEter] = useState(initialDefender.eterAtual)
  const [turns, setTurns] = useState<TurnLog[]>(initialTurns)
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(TURN_TIMER_SECONDS)
  const [showRangeMenu, setShowRangeMenu] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isMyTurn = session.activePlayerId === myCharacterId && session.status === 'active'
  const isPending = session.status === 'pending'
  const isFinished = session.status === 'finished'
  const isDefender = myCharacterId === session.defenderId
  const iWon = session.winnerId === myCharacterId
  const iLost = session.winnerId !== null && session.winnerId !== myCharacterId

  // Timer countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (session.status !== 'active' || !session.turnExpiresAt) return

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor(
        (new Date(session.turnExpiresAt!).getTime() - Date.now()) / 1000
      ))
      setTimer(remaining)

      if (remaining <= 0 && isMyTurn) {
        handleTimeout()
      }
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.turnExpiresAt, session.status, isMyTurn])

  // Supabase Realtime — combat_sessions changes
  useEffect(() => {
    const supabase = createClient()

    const sessionChannel = supabase
      .channel(`combat-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'combat_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          setSession({
            status: row.status as string,
            currentTurn: row.current_turn as number,
            activePlayerId: row.active_player_id as string | null,
            turnExpiresAt: row.turn_expires_at as string | null,
            winnerId: row.winner_id as string | null,
            modality: row.modality as string,
            challengerId: row.challenger_id as string,
            defenderId: row.defender_id as string,
          })
        }
      )
      .subscribe()

    // Realtime for combat_turns (new turns)
    const turnsChannel = supabase
      .channel(`combat-turns-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'combat_turns',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          setTurns((prev) => [{
            turnNumber: row.turn_number as number,
            actorId: row.actor_id as string,
            actionType: row.action_type as string,
            damageDealt: (row.damage_dealt as number) ?? 0,
            narrativeText: (row.narrative_text as string) ?? '',
          }, ...prev].slice(0, 10))
        }
      )
      .subscribe()

    // Realtime for character_attributes (HP/Eter changes)
    const attrsChannel = supabase
      .channel(`combat-attrs-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'character_attributes',
          filter: `character_id=eq.${initialSession.challengerId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          setChallengerHp(row.hp_atual as number)
          setChallengerEter(row.eter_atual as number)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'character_attributes',
          filter: `character_id=eq.${initialSession.defenderId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          setDefenderHp(row.hp_atual as number)
          setDefenderEter(row.eter_atual as number)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionChannel)
      supabase.removeChannel(turnsChannel)
      supabase.removeChannel(attrsChannel)
    }
  }, [sessionId, initialSession.challengerId, initialSession.defenderId])

  const handleTimeout = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      await fetch('/api/combat/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
    } finally {
      setLoading(false)
    }
  }, [sessionId, loading])

  const handleAction = async (action: Record<string, unknown>) => {
    if (loading || !isMyTurn) return
    setLoading(true)
    try {
      await fetch('/api/combat/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, action }),
      })
    } finally {
      setLoading(false)
      setShowRangeMenu(false)
    }
  }

  const handleAccept = async () => {
    if (loading) return
    setLoading(true)
    try {
      await fetch('/api/combat/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
    } finally {
      setLoading(false)
    }
  }

  const myEter = myCharacterId === initialSession.challengerId ? challengerEter : defenderEter

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="text-center">
        <p className="font-data text-[10px] text-[var(--text-ghost)] tracking-[0.2em] uppercase">
          {MODALITY_LABELS[session.modality] ?? session.modality}
        </p>
        <p className="font-data text-xs text-[var(--text-label)] tracking-[0.15em] mt-1">
          Turno {session.currentTurn}
        </p>
      </div>

      {/* Combatants */}
      <div className="grid grid-cols-2 gap-4">
        {/* Challenger */}
        <div className={`bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border ${
          session.activePlayerId === initialChallenger.id && session.status === 'active'
            ? 'border-[var(--ark-red-glow)]'
            : 'border-[var(--ark-border)]'
        }`}>
          <p className="font-display text-sm text-[var(--ark-gold-bright)] truncate">
            {initialChallenger.name}
          </p>
          <p className="font-data text-[10px] text-[var(--text-ghost)] tracking-[0.15em] uppercase">
            Nv.{initialChallenger.level} {initialChallenger.className}
          </p>
          <div className="mt-3 space-y-2">
            <ArkStatBar label="HP" current={challengerHp} max={initialChallenger.hpMax} type="hp" />
            <ArkStatBar label="Éter" current={challengerEter} max={initialChallenger.eterMax} type="eter" />
          </div>
        </div>

        {/* Defender */}
        <div className={`bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border ${
          session.activePlayerId === initialDefender.id && session.status === 'active'
            ? 'border-[var(--ark-red-glow)]'
            : 'border-[var(--ark-border)]'
        }`}>
          <p className="font-display text-sm text-[var(--ark-gold-bright)] truncate">
            {initialDefender.name}
          </p>
          <p className="font-data text-[10px] text-[var(--text-ghost)] tracking-[0.15em] uppercase">
            Nv.{initialDefender.level} {initialDefender.className}
          </p>
          <div className="mt-3 space-y-2">
            <ArkStatBar label="HP" current={defenderHp} max={initialDefender.hpMax} type="hp" />
            <ArkStatBar label="Éter" current={defenderEter} max={initialDefender.eterMax} type="eter" />
          </div>
        </div>
      </div>

      {/* Timer */}
      {session.status === 'active' && (
        <div className="text-center">
          <span className={`font-data text-lg tabular-nums ${
            timer <= 10 ? 'text-[var(--ark-red-glow)] animate-pulse' : 'text-[var(--text-secondary)]'
          }`}>
            {timer}s
          </span>
          <p className="font-data text-[10px] text-[var(--text-ghost)] tracking-[0.15em] uppercase mt-1">
            {isMyTurn ? 'Seu turno' : 'Turno do oponente'}
          </p>
        </div>
      )}

      {/* Pending: Accept button for defender */}
      {isPending && isDefender && (
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)] text-center">
          <p className="font-body text-sm text-[var(--text-secondary)] mb-4">
            {initialChallenger.name} desafiou voc&ecirc; para um {MODALITY_LABELS[session.modality]}.
          </p>
          <div className="flex gap-3 justify-center">
            <ArkButton variant="primary" onClick={handleAccept} disabled={loading}>
              {loading ? '...' : 'Aceitar'}
            </ArkButton>
            <ArkButton variant="danger" onClick={() => router.push('/dashboard')} disabled={loading}>
              Recusar
            </ArkButton>
          </div>
        </div>
      )}

      {isPending && !isDefender && (
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-6 border border-[var(--ark-border)] text-center">
          <p className="font-body text-sm text-[var(--text-label)]">
            Aguardando {initialDefender.name} aceitar o desafio...
          </p>
        </div>
      )}

      {/* Actions panel — only when it's my turn */}
      {isMyTurn && !isFinished && (
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border border-[var(--ark-border)]">
          <p className="font-data text-[10px] text-[var(--text-ghost)] tracking-[0.2em] uppercase mb-3">
            A&ccedil;&otilde;es
          </p>

          {/* Skills */}
          <div className="space-y-2 mb-3">
            {building
              .filter((s) => s.skill)
              .map((s) => (
                <button
                  key={s.slot}
                  disabled={loading || (s.skill?.eter_cost ?? 0) > myEter}
                  onClick={() => handleAction({ type: 'skill', skillId: s.skill!.id })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
                    (s.skill?.eter_cost ?? 0) > myEter
                      ? 'border-[#1a0808]/30 text-[var(--text-ghost)] cursor-not-allowed'
                      : 'border-[var(--ark-border)] hover:border-[var(--ark-border-bright)] text-[var(--text-primary)] cursor-pointer'
                  }`}
                >
                  <span className="font-body text-sm">{s.skill!.name}</span>
                  <span className="font-data text-[10px] text-attr-eter tracking-[0.1em]">
                    {s.skill!.eter_cost} &Eacute;ter
                  </span>
                </button>
              ))}
          </div>

          {/* Basic actions */}
          <div className="flex flex-wrap gap-2">
            <ArkButton
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => handleAction({ type: 'ataque_basico' })}
            >
              Ataque B&aacute;sico
            </ArkButton>

            <div className="relative">
              <ArkButton
                variant="secondary"
                size="sm"
                disabled={loading}
                onClick={() => setShowRangeMenu(!showRangeMenu)}
              >
                Mudar Range
              </ArkButton>
              {showRangeMenu && (
                <div className="absolute bottom-full left-0 mb-1 bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm overflow-hidden z-10">
                  {(['curto', 'medio', 'longo'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleAction({ type: 'mudar_range', rangeState: r })}
                      className="block w-full px-4 py-2 text-left font-data text-xs text-[var(--text-secondary)] hover:bg-[var(--ark-border)]/30 uppercase tracking-wider"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <UseItemButton
              characterId={myCharacterId}
              onUse={(itemId) => handleAction({ type: 'usar_item', itemId })}
            />

            <ArkButton
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => handleAction({ type: 'fuga' })}
            >
              Fuga
            </ArkButton>

            <ArkButton
              variant="danger"
              size="sm"
              disabled={loading}
              onClick={() => handleAction({ type: 'render' })}
            >
              Render-se
            </ArkButton>
          </div>
        </div>
      )}

      {/* Combat ended banner */}
      {isFinished && (
        <div className={`rounded-sm p-6 border text-center ${
          iWon
            ? 'border-[var(--ark-gold)]/30 bg-[var(--ark-gold)]/5'
            : iLost
              ? 'border-[var(--ark-red)]/30 bg-[var(--ark-red)]/5'
              : 'border-[var(--ark-border)] bg-[var(--ark-surface)]'
        }`}>
          <p className={`font-display text-lg uppercase tracking-wider ${
            iWon ? 'text-[var(--ark-gold-bright)]' : iLost ? 'text-[var(--ark-red-glow)]' : 'text-[var(--text-secondary)]'
          }`}>
            {iWon ? 'Vitória' : iLost ? 'Derrota' : 'Combate encerrado'}
          </p>

          {iLost && (
            <div className="mt-3 space-y-1">
              {DEFEAT_ESSENCIA_LOSS[session.modality] > 0 && (
                <p className="font-data text-xs text-[var(--text-label)]">
                  -{DEFEAT_ESSENCIA_LOSS[session.modality]} Ess&ecirc;ncias
                </p>
              )}
              {DEFEAT_RECOVERY_HOURS[session.modality] > 0 && (
                <p className="font-data text-xs text-[var(--text-label)]">
                  Recupera&ccedil;&atilde;o: {DEFEAT_RECOVERY_HOURS[session.modality]}h
                </p>
              )}
            </div>
          )}

          <ArkButton
            variant="secondary"
            className="mt-4"
            onClick={() => router.push('/dashboard')}
          >
            Voltar ao Dashboard
          </ArkButton>
        </div>
      )}

      {/* Turn log */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-4 border border-[var(--ark-border)]">
        <p className="font-data text-[10px] text-[var(--text-ghost)] tracking-[0.2em] uppercase mb-3">
          Log de Combate
        </p>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {turns.length === 0 ? (
            <p className="font-body text-xs text-[var(--text-ghost)] italic">
              Nenhuma a&ccedil;&atilde;o ainda.
            </p>
          ) : (
            turns.map((t, i) => (
              <div key={`${t.turnNumber}-${i}`} className="flex gap-2 items-baseline">
                <span className="font-data text-[10px] text-[var(--text-ghost)] tabular-nums flex-shrink-0">
                  T{t.turnNumber}
                </span>
                <p className="font-body text-xs text-[var(--text-secondary)]">
                  {t.narrativeText}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

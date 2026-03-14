'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'

interface PhaseLogEntry {
  phase: number
  narrative: string
  success: boolean
  casualties: string[]
}

interface SessionState {
  id: string
  status: string
  difficulty: string
  currentPhase: number
  totalPhases: number
  result: string | null
  phaseLog: PhaseLogEntry[]
  dungeonName: string
  dungeonDescription: string
  maxPlayers: number
}

interface ParticipantState {
  characterId: string
  name: string
  level: number
  status: string
  title: string | null
}

interface Props {
  sessionId: string
  characterId: string
  isLeader: boolean
  myStatus: string | null
  initialSession: SessionState
  initialParticipants: ParticipantState[]
  rewards: Array<{ character_id: string; xp_granted: number; libras_granted: number }>
}

const DIFFICULTY_BADGE: Record<string, 'alive' | 'injured' | 'crimson'> = {
  normal: 'alive',
  dificil: 'injured',
  lendario: 'crimson',
}

const PARTICIPANT_STATUS_LABEL: Record<string, string> = {
  invited: 'Convidado',
  ready: 'Pronto',
  active: 'Em combate',
  fallen: 'Caido',
  survived: 'Sobreviveu',
}

const PHASE_TIMER_SECONDS = 300 // 5 minutos por fase

export default function DungeonRoom({
  sessionId,
  characterId,
  isLeader,
  myStatus,
  initialSession,
  initialParticipants,
  rewards,
}: Props) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [participants, setParticipants] = useState(initialParticipants)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [timer, setTimer] = useState(PHASE_TIMER_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [currentMyStatus, setCurrentMyStatus] = useState(myStatus)

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()

    const sessionChannel = supabase
      .channel(`dungeon-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dungeon_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          setSession((prev) => ({
            ...prev,
            status: row.status as string,
            currentPhase: row.current_phase as number,
            result: (row.result as string) ?? null,
            phaseLog: (row.phase_log as PhaseLogEntry[]) ?? prev.phaseLog,
          }))
        }
      )
      .subscribe()

    const participantsChannel = supabase
      .channel(`dungeon-participants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dungeon_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Record<string, unknown>
            const charId = row.character_id as string

            setParticipants((prev) => {
              if (prev.find((p) => p.characterId === charId)) return prev
              return [...prev, {
                characterId: charId,
                name: '...',
                level: 0,
                status: row.status as string,
                title: null,
              }]
            })

            // Busca nome real do personagem
            const fetchClient = createClient()
            const { data: char } = await fetchClient
              .from('characters')
              .select('name, level, title')
              .eq('id', charId)
              .single()

            if (char) {
              setParticipants((prev) =>
                prev.map((p) =>
                  p.characterId === charId
                    ? { ...p, name: char.name, level: char.level, title: char.title ?? null }
                    : p
                )
              )
            }
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Record<string, unknown>
            setParticipants((prev) =>
              prev.map((p) =>
                p.characterId === row.character_id
                  ? { ...p, status: row.status as string }
                  : p
              )
            )
            if (row.character_id === characterId) {
              setCurrentMyStatus(row.status as string)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionChannel)
      supabase.removeChannel(participantsChannel)
    }
  }, [sessionId, characterId])

  const handleAcceptInvite = useCallback(async () => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/dungeon/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, character_id: characterId }),
      })
      const data = await res.json()
      if (!data.success) setMsg(data.error ?? 'Erro.')
      else setCurrentMyStatus('ready')
    } catch {
      setMsg('Erro de conexao.')
    }
    setLoading(false)
  }, [sessionId, characterId])

  const handleStartDungeon = useCallback(async () => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/dungeon/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, leader_id: characterId }),
      })
      const data = await res.json()
      if (!data.success) setMsg(data.error ?? 'Erro.')
    } catch {
      setMsg('Erro de conexao.')
    }
    setLoading(false)
  }, [sessionId, characterId])

  const handleInvite = useCallback(async () => {
    if (!inviteName.trim()) return
    setLoading(true)
    setMsg('')
    try {
      // Busca personagem por nome
      const supabase = createClient()
      const { data: target } = await supabase
        .from('characters')
        .select('id')
        .ilike('name', inviteName.trim())
        .maybeSingle()

      if (!target) {
        setMsg('Personagem nao encontrado.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/dungeon/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          leader_id: characterId,
          target_character_id: target.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setInviteName('')
        setMsg('Convite enviado.')
      } else {
        setMsg(data.error ?? 'Erro ao convidar.')
      }
    } catch {
      setMsg('Erro de conexao.')
    }
    setLoading(false)
  }, [sessionId, characterId, inviteName])

  const handleResolvePhase = useCallback(async () => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/dungeon/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.phaseResult) {
          setSession((prev) => ({
            ...prev,
            phaseLog: [...prev.phaseLog, data.phaseResult as PhaseLogEntry],
            currentPhase: data.dungeonFinished ? prev.currentPhase : prev.currentPhase + 1,
            status: data.dungeonFinished ? (data.finalResult === 'failure' ? 'failed' : 'finished') : prev.status,
            result: data.finalResult ?? prev.result,
          }))
        }
        setTimer(PHASE_TIMER_SECONDS)
      } else {
        setMsg(data.error ?? 'Erro.')
      }
    } catch {
      setMsg('Erro de conexao.')
    }
    setLoading(false)
  }, [sessionId])

  // Phase timer
  useEffect(() => {
    if (session.status !== 'active') {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    setTimer(PHASE_TIMER_SECONDS)
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          // Timer expirado — auto-resolve
          if (isLeader) {
            handleResolvePhase()
          }
          return PHASE_TIMER_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [session.status, session.currentPhase, isLeader, handleResolvePhase])

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const isFinished = session.status === 'finished' || session.status === 'failed' || session.status === 'cancelled'
  const allReady = participants.length >= 2 && participants.every((p) => p.status === 'ready')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-lg text-[var(--text-primary)]">{session.dungeonName}</h1>
          <div className="flex items-center gap-2">
            <ArkBadge color={DIFFICULTY_BADGE[session.difficulty] ?? 'crimson'} className="text-[9px]">
              {session.difficulty}
            </ArkBadge>
            <ArkBadge
              color={session.status === 'active' ? 'alive' : isFinished ? 'crimson' : 'injured'}
              className="text-[9px]"
            >
              {session.status === 'recruiting' ? 'Recrutando' :
               session.status === 'active' ? 'Em andamento' :
               session.status === 'finished' ? 'Finalizada' :
               session.status === 'failed' ? 'Derrota' : 'Cancelada'}
            </ArkBadge>
          </div>
        </div>
        <p className="text-xs font-body text-[var(--text-secondary)]">{session.dungeonDescription}</p>

        {session.status === 'active' && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--ark-border)]">
            <span className="text-xs font-data text-[var(--text-label)]">
              Fase {session.currentPhase} de {session.totalPhases}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-data text-[var(--ark-red-glow)] tabular-nums">
                {formatTimer(timer)}
              </span>
              {isLeader && (
                <ArkButton size="sm" disabled={loading} onClick={handleResolvePhase}>
                  Resolver Fase
                </ArkButton>
              )}
            </div>
          </div>
        )}
      </div>

      {msg && (
        <p className={`text-xs font-data ${msg.includes('Erro') || msg.includes('nao') ? 'text-[var(--ark-red-glow)]' : 'text-status-alive'}`}>
          {msg}
        </p>
      )}

      {/* Result banner */}
      {isFinished && session.result && (
        <div className={`border rounded-sm p-6 text-center ${
          session.result === 'success'
            ? 'bg-status-alive/10 border-status-alive/30'
            : session.result === 'partial'
              ? 'bg-[var(--ark-amber)]/10 border-[var(--ark-amber)]/30'
              : 'bg-[var(--ark-red)]/10 border-[var(--ark-red)]/30'
        }`}>
          <h2 className={`font-display text-xl mb-2 ${
            session.result === 'success' ? 'text-status-alive' :
            session.result === 'partial' ? 'text-[var(--ark-amber)]' :
            'text-[var(--ark-red-glow)]'
          }`}>
            {session.result === 'success' ? 'Vitoria Total' :
             session.result === 'partial' ? 'Vitoria Parcial' :
             'Derrota'}
          </h2>
          {rewards.length > 0 && (
            <div className="space-y-1 mt-3">
              {rewards.map((r) => {
                const pName = participants.find((p) => p.characterId === r.character_id)?.name ?? '?'
                return (
                  <p key={r.character_id} className="text-xs font-data text-[var(--text-secondary)]">
                    {pName}: +{r.xp_granted} XP, +{r.libras_granted} Libras
                  </p>
                )
              })}
            </div>
          )}
          <ArkButton size="sm" className="mt-4" onClick={() => router.push('/dungeon')}>
            Voltar para Dungeons
          </ArkButton>
        </div>
      )}

      {/* Phase progress bar */}
      {session.status === 'active' && (
        <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
          <div className="flex gap-1">
            {Array.from({ length: session.totalPhases }, (_, i) => {
              const phaseNum = i + 1
              const logEntry = session.phaseLog.find((l) => l.phase === phaseNum)
              return (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-sm ${
                    logEntry
                      ? logEntry.success
                        ? 'bg-status-alive'
                        : 'bg-[var(--ark-red-glow)]'
                      : phaseNum === session.currentPhase
                        ? 'bg-[var(--ark-amber)] animate-pulse'
                        : 'bg-[var(--ark-border)]'
                  }`}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
        <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
          Participantes ({participants.length}/{session.maxPlayers})
        </h3>
        <div className="space-y-2">
          {participants.map((p) => (
            <div key={p.characterId} className="flex items-center justify-between py-2 border-b border-[var(--ark-border)]/50 last:border-0">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm text-[var(--ark-gold-bright)]">{p.name}</span>
                <span className="text-xs font-data text-[var(--text-label)]">Nv {p.level}</span>
                {p.title && <span className="text-xs font-data text-[var(--text-ghost)]">{p.title}</span>}
              </div>
              <ArkBadge
                color={
                  p.status === 'ready' || p.status === 'survived' ? 'alive' :
                  p.status === 'active' ? 'injured' :
                  p.status === 'fallen' ? 'crimson' :
                  'gold'
                }
                className="text-[9px]"
              >
                {PARTICIPANT_STATUS_LABEL[p.status] ?? p.status}
              </ArkBadge>
            </div>
          ))}
        </div>
      </div>

      {/* Recruiting actions */}
      {session.status === 'recruiting' && (
        <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
          {/* Accept invite */}
          {currentMyStatus === 'invited' && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-data text-[var(--text-label)]">Voce foi convidado para esta dungeon.</span>
              <ArkButton size="sm" disabled={loading} onClick={handleAcceptInvite}>
                Aceitar Convite
              </ArkButton>
            </div>
          )}

          {/* Invite (leader only) */}
          {isLeader && (
            <div className="flex items-center gap-2">
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nome do personagem..."
                className="flex-1 px-3 py-2 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] font-data placeholder:text-[var(--text-ghost)] focus:border-[var(--ark-border-bright)] focus:outline-none"
              />
              <ArkButton size="sm" disabled={loading || !inviteName.trim()} onClick={handleInvite}>
                Convidar
              </ArkButton>
            </div>
          )}

          {/* Start (leader only) */}
          {isLeader && (
            <ArkButton
              size="sm"
              disabled={loading || !allReady}
              onClick={handleStartDungeon}
              className="w-full"
            >
              {allReady ? 'Iniciar Dungeon' : 'Aguardando todos ficarem prontos...'}
            </ArkButton>
          )}
        </div>
      )}

      {/* Phase log */}
      {session.phaseLog.length > 0 && (
        <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
          <h3 className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
            Log de Fases
          </h3>
          <div className="space-y-3">
            {session.phaseLog.map((entry, i) => (
              <div key={i} className="border-b border-[var(--ark-border)]/50 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <ArkBadge color={entry.success ? 'alive' : 'crimson'} className="text-[9px]">
                    Fase {entry.phase}
                  </ArkBadge>
                  <span className="text-[10px] font-data text-[var(--text-ghost)]">
                    {entry.success ? 'Sucesso' : 'Dificuldade'}
                  </span>
                </div>
                <p className="text-xs font-body text-[var(--text-secondary)] leading-relaxed">
                  {entry.narrative}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

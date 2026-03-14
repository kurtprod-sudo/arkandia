'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'

interface DungeonTypeRow {
  id: string
  name: string
  description: string
  difficulty: string
  min_players: number
  max_players: number
  min_level: number
  duration_minutes: number
  phases: number
  base_xp_reward: number
  base_libras_reward: number
}

interface Props {
  dungeonTypes: DungeonTypeRow[]
  characterId: string
  characterLevel: number
  isRecovering: boolean
  hasActiveSession: boolean
}

const DIFFICULTY_BADGE: Record<string, 'alive' | 'injured' | 'crimson'> = {
  normal:   'alive',
  dificil:  'injured',
  lendario: 'crimson',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  normal:   'Normal',
  dificil:  'Dificil',
  lendario: 'Lendario',
}

export default function DungeonList({ dungeonTypes, characterId, characterLevel, isRecovering, hasActiveSession }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(dungeonTypeId: string, difficulty: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dungeon/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          dungeon_type_id: dungeonTypeId,
          difficulty,
        }),
      })
      const data = await res.json()
      if (data.success && data.sessionId) {
        router.push(`/dungeon/${data.sessionId}`)
      } else {
        setError(data.error ?? 'Erro ao criar dungeon.')
      }
    } catch {
      setError('Erro de conexao.')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs font-data text-[var(--ark-red-glow)]">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {dungeonTypes.map((dt) => {
          const canJoin = characterLevel >= dt.min_level && !isRecovering && !hasActiveSession
          return (
            <div key={dt.id} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm text-[var(--text-primary)]">{dt.name}</h3>
                <ArkBadge color={DIFFICULTY_BADGE[dt.difficulty] ?? 'crimson'} className="text-[9px]">
                  {DIFFICULTY_LABEL[dt.difficulty] ?? dt.difficulty}
                </ArkBadge>
              </div>

              <p className="text-xs font-body text-[var(--text-secondary)] leading-relaxed">
                {dt.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-data text-[var(--text-label)]">
                <span>Nivel min: {dt.min_level}</span>
                <span>Jogadores: {dt.min_players}-{dt.max_players}</span>
                <span>Fases: {dt.phases}</span>
                <span>~{dt.duration_minutes} min</span>
              </div>

              <div className="flex items-center gap-3 text-xs font-data text-[var(--text-label)]">
                <span className="text-[var(--ark-amber)]">+{dt.base_xp_reward} XP</span>
                <span className="text-[var(--text-secondary)]">+{dt.base_libras_reward} Libras</span>
              </div>

              <ArkButton
                size="sm"
                disabled={!canJoin || loading}
                onClick={() => handleCreate(dt.id, dt.difficulty)}
                className="w-full"
              >
                {!canJoin
                  ? characterLevel < dt.min_level
                    ? `Nivel ${dt.min_level} necessario`
                    : isRecovering
                      ? 'Em recuperacao'
                      : 'Ja em dungeon'
                  : 'Criar Grupo'}
              </ArkButton>
            </div>
          )
        })}
      </div>

      {dungeonTypes.length === 0 && (
        <p className="text-[var(--text-label)] text-sm font-body italic text-center py-8">
          Nenhuma dungeon disponivel no momento.
        </p>
      )}
    </div>
  )
}

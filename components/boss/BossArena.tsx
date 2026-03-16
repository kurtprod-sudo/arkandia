'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'

interface BossArenaProps {
  initialBossId: string; initialBossName: string
  initialBossHp: number; initialBossHpMax: number
  initialPlayerHp: number; initialPlayerHpMax: number
  initialPlayerEter: number; initialPlayerEterMax: number
  building: Array<{ slot: number; skill: { id: string; name: string; eterCost: number } | null }>
  attacksRemaining: number
}

interface TurnLog { text: string; actor: string }

export default function BossArena(props: BossArenaProps) {
  const router = useRouter()
  const [bossHp, setBossHp] = useState(props.initialBossHp)
  const [playerHp, setPlayerHp] = useState(props.initialPlayerHp)
  const [playerEter, setPlayerEter] = useState(props.initialPlayerEter)
  const [log, setLog] = useState<TurnLog[]>([])
  const [loading, setLoading] = useState(false)
  const [ended, setEnded] = useState(false)
  const [endMsg, setEndMsg] = useState('')

  const bossHpPct = Math.max(0, (bossHp / props.initialBossHpMax) * 100)
  const playerHpPct = Math.max(0, (playerHp / props.initialPlayerHpMax) * 100)
  const playerEterPct = Math.max(0, (playerEter / props.initialPlayerEterMax) * 100)

  const handleAction = async (action: { type: 'ataque_basico' | 'skill'; skillName?: string }) => {
    setLoading(true)
    const res = await fetch('/api/boss/attack', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boss_id: props.initialBossId, action }),
    })
    const data = await res.json()
    if (data.success && data.turnResult) {
      const tr = data.turnResult
      setBossHp(tr.bossHpAfter)
      setPlayerHp(tr.playerHpAfter)
      if (action.type === 'skill') {
        const skill = props.building.find((b) => b.skill?.name === action.skillName)?.skill
        if (skill) setPlayerEter((prev) => Math.max(0, prev - skill.eterCost))
      }
      setLog((prev) => [...prev.slice(-4), { text: tr.narrativeText, actor: tr.actor }])
      if (tr.bossDefeated) { setEnded(true); setEndMsg('Boss derrotado!') }
      if (tr.playerDefeated) { setEnded(true); setEndMsg('Você foi derrotado.') }
    }
    setLoading(false)
  }

  const handleExit = async () => {
    setLoading(true)
    await fetch('/api/boss/end', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boss_id: props.initialBossId }),
    })
    router.push('/boss'); router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Boss HP */}
      <div>
        <div className="flex justify-between text-[10px] font-data text-[var(--text-label)] mb-0.5">
          <span>{props.initialBossName}</span>
          <span>{bossHp.toLocaleString()} / {props.initialBossHpMax.toLocaleString()}</span>
        </div>
        <div className="h-3 bg-[var(--ark-bg)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--ark-red-glow)] rounded-full transition-all" style={{ width: `${bossHpPct}%` }} />
        </div>
      </div>

      {/* Player bars */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex justify-between text-[9px] font-data text-[var(--text-label)]">
            <span>HP</span><span>{playerHp}/{props.initialPlayerHpMax}</span>
          </div>
          <div className="h-2 bg-[var(--ark-bg)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--ark-red-glow)] rounded-full transition-all" style={{ width: `${playerHpPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[9px] font-data text-[var(--text-label)]">
            <span>Éter</span><span>{playerEter}/{props.initialPlayerEterMax}</span>
          </div>
          <div className="h-2 bg-[var(--ark-bg)] rounded-full overflow-hidden">
            <div className="h-full bg-gray-400 rounded-full transition-all" style={{ width: `${playerEterPct}%` }} />
          </div>
        </div>
      </div>

      {/* Combat log */}
      <div className="bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm p-3 min-h-[80px]">
        {log.length === 0 && <p className="text-xs font-body text-[var(--text-ghost)] italic">Escolha uma ação para atacar.</p>}
        {log.map((l, i) => (
          <p key={i} className={`text-[10px] font-body ${l.actor === 'player' ? 'text-[var(--text-secondary)]' : 'text-[var(--ark-red-glow)]'}`}>
            {l.text}
          </p>
        ))}
        {endMsg && <p className="text-xs font-display font-bold text-[var(--text-primary)] mt-2">{endMsg}</p>}
      </div>

      {/* Actions */}
      {!ended ? (
        <div className="flex flex-wrap gap-2">
          <ArkButton size="sm" onClick={() => handleAction({ type: 'ataque_basico' })} disabled={loading}>
            {loading ? '...' : 'Ataque Básico'}
          </ArkButton>
          {props.building.filter((b) => b.skill && playerEter >= b.skill.eterCost).map((b) => (
            <ArkButton key={b.slot} size="sm" variant="secondary"
              onClick={() => handleAction({ type: 'skill', skillName: b.skill!.name })} disabled={loading}>
              {b.skill!.name} ({b.skill!.eterCost}E)
            </ArkButton>
          ))}
          <ArkButton size="sm" variant="ghost" onClick={handleExit} disabled={loading}>
            Recuar
          </ArkButton>
        </div>
      ) : (
        <ArkButton onClick={handleExit} className="w-full">Voltar</ArkButton>
      )}
    </div>
  )
}

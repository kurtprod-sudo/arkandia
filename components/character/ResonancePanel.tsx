'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import { calcResonanceEter, calcResonanceCost } from '@/lib/game/attributes'

const ARCHETYPE_COLORS: Record<string, string> = {
  ordem: '#C8B560', caos: '#9B4DCA', tempo: '#4DA6CA', espaco: '#1A1A8E',
  materia: '#8B6914', vida: '#2D7A3A', morte: '#8A2020', vontade: '#FFFFFF',
  sonho: '#C44DA6', guerra: '#CA4D4D', vinculo: '#4DCAAA', ruina: '#5A5A5A',
}

const ARCHETYPE_DESCS: Record<string, string> = {
  ordem:   'O Arquétipo da Ordem estrutura e sustenta. Seus ecos falam de lei, de ciclos fixos, de prisões e proteções simultaneamente.',
  caos:    'O Arquétipo do Caos não reconhece limites. Mutação, possibilidade infinita, criação e destruição sem medida.',
  tempo:   'O Arquétipo do Tempo pulsa com paciência e presciência. Ecos de eras passadas e sombras de futuros não nascidos.',
  espaco:  'O Arquétipo do Espaço separa e conecta. Distância, presença simultânea, portas entre o que existe e o que poderia existir.',
  materia: 'O Arquétipo da Matéria é peso e substância. Construção, permanência, coisas que duram além de quem as criou.',
  vida:    'O Arquétipo da Vida cresce e transforma. Ciclos de nascimento, venenos e remédios que são a mesma coisa.',
  morte:   'O Arquétipo da Morte é fim e passagem. Espectros, ciclos completos, o que resta depois que tudo mais vai embora.',
  vontade: 'O Arquétipo da Vontade quebra limites. Resistência absoluta, a última coisa que fica quando tudo mais foi tirado.',
  sonho:   'O Arquétipo do Sonho cria e ilude. Duplicatas, percepção, o que é real quando a realidade é maleável.',
  guerra:  'O Arquétipo da Guerra forja e destrói. Técnica, conflito como catalisador, o que o combate revela sobre quem luta.',
  vinculo: 'O Arquétipo do Vínculo conecta. Pactos, o que é transferido entre seres, laços que definem identidade.',
  ruina:   'O Arquétipo da Ruína anula e corrói. Fins inevitáveis, o que sobrevive à destruição, a beleza no que está se desfazendo.',
}

// Simple SVG symbol (same as in modal but reusable)
function ArchSymbol({ type, size = 32 }: { type: string; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {type === 'ordem' && <><rect x="6" y="6" width="20" height="20" rx="2"/><line x1="16" y1="6" x2="16" y2="26"/><line x1="6" y1="16" x2="26" y2="16"/></>}
      {type === 'caos' && <><path d="M16 4 C20 10, 28 12, 22 18 C16 24, 8 20, 12 14 C16 8, 10 4, 16 4Z"/><circle cx="20" cy="8" r="2"/></>}
      {type === 'tempo' && <><path d="M10 6 L22 6 L18 14 L22 14 L18 14 L22 26 L10 26 L14 18 L10 18Z"/></>}
      {type === 'espaco' && <><circle cx="16" cy="16" r="6"/><ellipse cx="16" cy="16" rx="12" ry="4"/><ellipse cx="16" cy="16" rx="4" ry="12"/></>}
      {type === 'materia' && <><polygon points="16,4 26,10 26,22 16,28 6,22 6,10"/></>}
      {type === 'vida' && <><path d="M16 28 L16 10 M16 10 C12 6, 6 8, 8 14 M16 10 C20 6, 26 8, 24 14"/></>}
      {type === 'morte' && <><path d="M8 8 C8 8, 24 24, 24 24 M24 8 L24 14 C24 18, 20 22, 16 26 M8 8 L14 8"/></>}
      {type === 'vontade' && <><path d="M16 28 L16 20 M10 20 Q10 10, 16 4 Q22 10, 22 20 Z"/></>}
      {type === 'sonho' && <><path d="M20 6 C10 6, 6 16, 14 24 C6 20, 6 10, 16 6 Z"/><circle cx="14" cy="14" r="1"/><circle cx="18" cy="18" r="1"/></>}
      {type === 'guerra' && <><line x1="16" y1="4" x2="16" y2="28"/><line x1="10" y1="10" x2="22" y2="10"/><path d="M12 4 L16 8 L20 4"/></>}
      {type === 'vinculo' && <><circle cx="12" cy="16" r="7"/><circle cx="20" cy="16" r="7"/></>}
      {type === 'ruina' && <><circle cx="16" cy="16" r="10"/><line x1="6" y1="16" x2="26" y2="16"/><path d="M12 12 L10 8"/><path d="M20 20 L22 24"/></>}
    </svg>
  )
}

interface ResonancePanelProps {
  archetype: string
  resonanceLevel: number
  essenciaBalance: number
}

export default function ResonancePanel({
  archetype, resonanceLevel, essenciaBalance,
}: ResonancePanelProps) {
  const router = useRouter()
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState('')

  const color = ARCHETYPE_COLORS[archetype] ?? '#d3a539'
  const desc = ARCHETYPE_DESCS[archetype] ?? ''
  const displayName = archetype.charAt(0).toUpperCase() + archetype.slice(1)

  const maxVisibleLevels = 8
  const nextLevel = resonanceLevel + 1
  const nextCost = calcResonanceCost(nextLevel)
  const nextEterBonus = calcResonanceEter(nextLevel)
  const canUpgrade = essenciaBalance >= nextCost

  // Total Éter from all resonance levels
  let totalEterFromResonance = 0
  for (let i = 1; i <= resonanceLevel; i++) {
    totalEterFromResonance += calcResonanceEter(i)
  }

  const handleUpgrade = async () => {
    setUpgrading(true)
    setError('')
    const res = await fetch('/api/character/upgrade-resonance', { method: 'POST' })
    const data = await res.json()
    if (!data.success) setError(data.error ?? 'Erro.')
    else router.refresh()
    setUpgrading(false)
  }

  return (
    <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm border border-[var(--ark-border)] overflow-hidden">
      {/* Color accent bar */}
      <div className="h-1" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Constellation diagram */}
        <div className="flex items-center justify-center">
          <div className="relative w-[280px] h-[280px]">
            {/* Center: archetype symbol */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80px] h-[80px] rounded-full flex items-center justify-center"
              style={{
                border: `2px solid ${color}60`,
                background: `radial-gradient(circle, ${color}15, transparent)`,
                animation: 'res-glow-breathe 3s ease-in-out infinite',
                color,
              }}
            >
              <style>{`@keyframes res-glow-breathe{0%,100%{box-shadow:0 0 8px ${color}30}50%{box-shadow:0 0 20px ${color}50}}`}</style>
              <ArchSymbol type={archetype} size={36} />
            </div>

            {/* SVG lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 280">
              {Array.from({ length: maxVisibleLevels }, (_, i) => {
                const next = (i + 1) % maxVisibleLevels
                const r = 110
                const cx = 140, cy = 140
                const a1 = (i * (360 / maxVisibleLevels) - 90) * Math.PI / 180
                const a2 = (next * (360 / maxVisibleLevels) - 90) * Math.PI / 180
                const unlocked = i < resonanceLevel && next < resonanceLevel
                return <line key={i}
                  x1={cx + r * Math.cos(a1)} y1={cy + r * Math.sin(a1)}
                  x2={cx + r * Math.cos(a2)} y2={cy + r * Math.sin(a2)}
                  stroke={unlocked ? color : 'var(--ark-border)'}
                  strokeWidth={unlocked ? 1.5 : 0.5}
                  opacity={unlocked ? 0.8 : 0.2}
                />
              })}
            </svg>

            {/* Level nodes */}
            {Array.from({ length: maxVisibleLevels }, (_, i) => {
              const lvl = i + 1
              const unlocked = lvl <= resonanceLevel
              const angle = (i * (360 / maxVisibleLevels) - 90) * Math.PI / 180
              const r = 110
              const x = 50 + (r / 140) * 50 * Math.cos(angle)
              const y = 50 + (r / 140) * 50 * Math.sin(angle)
              const nodeCost = calcResonanceCost(lvl)

              return (
                <div
                  key={lvl}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={unlocked ? `Nível ${lvl}` : `Nível ${lvl} — ${nodeCost} Essências`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-data font-bold transition-all ${
                    unlocked
                      ? 'border-2'
                      : 'border border-[var(--ark-border)] bg-[var(--ark-bg)] text-[var(--text-ghost)]'
                  }`} style={unlocked ? {
                    borderColor: color,
                    background: `${color}20`,
                    color,
                    boxShadow: `0 0 8px ${color}30`,
                  } : undefined}>
                    {lvl}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT — Info + Upgrade */}
        <div className="space-y-4">
          <div>
            <p className="text-lg font-display font-bold" style={{ color }}>{displayName}</p>
            <p className="text-xs font-body text-[var(--text-secondary)] mt-1 leading-relaxed">{desc}</p>
          </div>

          <div className="border-t border-[var(--ark-border)] pt-3">
            <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Ressonância</p>
            <div className="flex items-center gap-4 text-sm font-data">
              <span className="text-[var(--text-primary)]">Nível <span style={{ color }}>{resonanceLevel}</span></span>
              <span className="text-[var(--text-label)]">Éter bônus: <span className="text-[var(--text-primary)]">+{totalEterFromResonance}</span></span>
            </div>
            {/* Progress bar */}
            <div className="flex gap-1 mt-2">
              {Array.from({ length: maxVisibleLevels }, (_, i) => (
                <div key={i} className="h-1.5 flex-1 rounded-full" style={{
                  background: i < resonanceLevel ? color : 'var(--ark-bg)',
                  opacity: i < resonanceLevel ? 0.8 : 0.3,
                }} />
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--ark-border)] pt-3">
            <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Próximo nível</p>
            <div className="space-y-1 text-xs font-data">
              <p className="text-[var(--text-secondary)]">Custo: <span className="text-[var(--text-primary)]">{nextCost} Essências</span></p>
              <p className="text-[var(--text-secondary)]">Éter adicional: <span style={{ color }}>+{nextEterBonus}</span></p>
              <p className="text-[var(--text-label)]">Saldo: {essenciaBalance} Essências</p>
            </div>
            {error && <p className="text-[10px] font-data text-[var(--ark-red-glow)] mt-2">{error}</p>}
            <ArkButton
              onClick={handleUpgrade}
              disabled={upgrading || !canUpgrade}
              className="w-full mt-3"
              size="sm"
            >
              {upgrading ? 'Evoluindo...' : canUpgrade ? 'Evoluir Ressonância' : 'Essências insuficientes'}
            </ArkButton>
          </div>
        </div>
      </div>
    </div>
  )
}

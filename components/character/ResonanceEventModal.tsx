'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'

const ARCHETYPES = [
  { key: 'ordem',   name: 'Ordem',   desc: 'Estrutura. Lei. O que sustenta o mundo.' },
  { key: 'caos',    name: 'Caos',    desc: 'Mutação. Possibilidade. O que rompe limites.' },
  { key: 'tempo',   name: 'Tempo',   desc: 'Paciência. Presciência. O ciclo que tudo governa.' },
  { key: 'espaco',  name: 'Espaço',  desc: 'Distância. Presença. O que separa e conecta.' },
  { key: 'materia', name: 'Matéria', desc: 'Peso. Permanência. O que dura além de quem criou.' },
  { key: 'vida',    name: 'Vida',    desc: 'Crescimento. Transformação. O ciclo que não para.' },
  { key: 'morte',   name: 'Morte',   desc: 'Fim. Passagem. O que resta quando tudo vai.' },
  { key: 'vontade', name: 'Vontade', desc: 'Resistência. O que fica quando tudo é tirado.' },
  { key: 'sonho',   name: 'Sonho',   desc: 'Ilusão. Criação. O que é real quando tudo é maleável.' },
  { key: 'guerra',  name: 'Guerra',  desc: 'Técnica. Conflito. O que o combate revela.' },
  { key: 'vinculo', name: 'Vínculo', desc: 'Pacto. Conexão. O que define identidade.' },
  { key: 'ruina',   name: 'Ruína',   desc: 'Entropia. Corrosão. O fim inevitável de toda criação.' },
]

const ARCHETYPE_COLORS: Record<string, string> = {
  ordem: '#C8B560', caos: '#9B4DCA', tempo: '#4DA6CA', espaco: '#1A1A8E',
  materia: '#8B6914', vida: '#2D7A3A', morte: '#8A2020', vontade: '#FFFFFF',
  sonho: '#C44DA6', guerra: '#CA4D4D', vinculo: '#4DCAAA', ruina: '#5A5A5A',
}

// SVG symbols for each archetype
function ArchetypeSymbol({ type, size = 32 }: { type: string; size?: number }) {
  const s = size
  const half = s / 2
  return (
    <svg viewBox={`0 0 ${s} ${s}`} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {type === 'ordem' && <><rect x="6" y="6" width="20" height="20" rx="2"/><line x1="16" y1="6" x2="16" y2="26"/><line x1="6" y1="16" x2="26" y2="16"/></>}
      {type === 'caos' && <><path d="M16 4 C20 10, 28 12, 22 18 C16 24, 8 20, 12 14 C16 8, 10 4, 16 4Z"/><circle cx="20" cy="8" r="2"/></>}
      {type === 'tempo' && <><path d="M10 6 L22 6 L18 14 L22 14 L18 14 L22 26 L10 26 L14 18 L10 18Z"/><circle cx="16" cy="16" r="1.5"/></>}
      {type === 'espaco' && <><circle cx={half} cy={half} r="6"/><ellipse cx={half} cy={half} rx="12" ry="4"/><ellipse cx={half} cy={half} rx="4" ry="12"/></>}
      {type === 'materia' && <><polygon points="16,4 26,10 26,22 16,28 6,22 6,10"/><line x1="16" y1="4" x2="16" y2="28"/><line x1="6" y1="10" x2="26" y2="22"/><line x1="26" y1="10" x2="6" y2="22"/></>}
      {type === 'vida' && <><path d="M16 28 L16 10 M16 10 C12 6, 6 8, 8 14 M16 10 C20 6, 26 8, 24 14 M16 16 C12 14, 8 16, 10 20 M16 16 C20 14, 24 16, 22 20"/></>}
      {type === 'morte' && <><path d="M8 8 C8 8, 24 24, 24 24 M24 8 L24 14 C24 18, 20 22, 16 26 M8 8 L14 8"/></>}
      {type === 'vontade' && <><path d="M16 28 L16 20 M10 20 Q10 10, 16 4 Q22 10, 22 20 Z"/><line x1="13" y1="14" x2="19" y2="14"/></>}
      {type === 'sonho' && <><path d="M20 6 C10 6, 6 16, 14 24 C6 20, 6 10, 16 6 Z"/><circle cx="14" cy="14" r="1"/><circle cx="18" cy="18" r="1"/><circle cx="12" cy="20" r="0.8"/></>}
      {type === 'guerra' && <><line x1="16" y1="4" x2="16" y2="28"/><line x1="10" y1="10" x2="22" y2="10"/><path d="M12 4 L16 8 L20 4"/><path d="M14 28 L16 24 L18 28"/></>}
      {type === 'vinculo' && <><circle cx="12" cy="16" r="7"/><circle cx="20" cy="16" r="7"/></>}
      {type === 'ruina' && <><circle cx={half} cy={half} r="10"/><line x1="6" y1="16" x2="26" y2="16"/><path d="M12 12 L10 8"/><path d="M20 12 L22 8"/><path d="M12 20 L10 24"/><path d="M20 20 L22 24"/></>}
    </svg>
  )
}

const INTRO_LINES = [
  'Algo desperta...',
  '',
  'Durante anos, um Arquétipo dormiu dentro de você.',
  'Silencioso. Paciente. Aguardando.',
  'Esse momento chegou.',
  '',
  'Qual é a força que pulsa em você?',
]

export default function ResonanceEventModal() {
  const router = useRouter()
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [visibleLines, setVisibleLines] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  // Phase 1: reveal lines
  useEffect(() => {
    if (phase !== 1) return
    const timers: ReturnType<typeof setTimeout>[] = []
    INTRO_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 600 + i * 700))
    })
    timers.push(setTimeout(() => setPhase(2), 600 + INTRO_LINES.length * 700 + 1000))
    return () => timers.forEach(clearTimeout)
  }, [phase])

  const handleConfirm = async () => {
    if (!selected) return
    setConfirming(true)
    const res = await fetch('/api/character/choose-archetype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archetype: selected }),
    })
    if (res.ok) {
      setPhase(3)
      setConfirmed(true)
      setTimeout(() => { router.push('/character'); router.refresh() }, 2000)
    }
    setConfirming(false)
  }

  const activeArchetype = hovered ?? selected
  const activeData = ARCHETYPES.find((a) => a.key === activeArchetype)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto">
      <style>{`
        @keyframes res-particle { 0%,100%{opacity:0.2;transform:translateY(0)} 50%{opacity:0.7;transform:translateY(-30px)} }
        @keyframes res-glow { 0%,100%{box-shadow:0 0 10px rgba(211,165,57,0.3)} 50%{box-shadow:0 0 25px rgba(211,165,57,0.6)} }
        .res-particle{position:absolute;width:3px;height:3px;border-radius:50%;background:var(--ark-gold-bright)}
        .res-p1{left:10%;top:80%;animation:res-particle 5s ease-in-out infinite}
        .res-p2{left:85%;top:20%;animation:res-particle 7s ease-in-out infinite 1s}
        .res-p3{left:50%;top:90%;animation:res-particle 6s ease-in-out infinite 2s}
        .res-p4{left:30%;top:15%;animation:res-particle 8s ease-in-out infinite 0.5s}
      `}</style>
      <span className="res-particle res-p1"/><span className="res-particle res-p2"/>
      <span className="res-particle res-p3"/><span className="res-particle res-p4"/>

      {/* PHASE 1 — Intro */}
      {phase === 1 && (
        <div className="text-center px-4 cursor-pointer" onClick={() => setPhase(2)}>
          <div className="space-y-3 max-w-md mx-auto">
            {INTRO_LINES.map((line, i) => (
              <p key={i} className={`text-sm font-body leading-relaxed transition-all duration-700 ${
                i === 0 ? 'text-[var(--ark-gold-bright)] font-display text-xl' :
                line === '' ? 'h-4' :
                i === INTRO_LINES.length - 1 ? 'text-[var(--ark-gold-bright)] font-semibold' :
                'text-[var(--text-secondary)]'
              } ${i < visibleLines ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* PHASE 2 — Archetype Choice */}
      {phase === 2 && !confirmed && (
        <div className="flex flex-col items-center px-4 py-8 max-w-lg w-full">
          {/* Circular layout */}
          <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px] shrink-0">
            {/* Center element */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full border border-[var(--ark-gold)]/40 flex flex-col items-center justify-center text-center"
              style={{ animation: selected ? 'res-glow 2s ease-in-out infinite' : undefined,
                       background: selected ? `radial-gradient(circle, ${ARCHETYPE_COLORS[selected]}15, transparent)` : 'var(--ark-bg)' }}>
              {activeData ? (
                <>
                  <ArchetypeSymbol type={activeData.key} size={28} />
                  <p className="text-[9px] font-data text-[var(--ark-gold-bright)] mt-1 uppercase tracking-wider">{activeData.name}</p>
                </>
              ) : (
                <p className="text-[8px] font-data text-[var(--text-ghost)] uppercase tracking-wider px-2">Escolha seu Arquétipo</p>
              )}
            </div>

            {/* SVG connector lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
              {ARCHETYPES.map((a, i) => {
                const next = (i + 1) % 12
                const r = 160
                const cx = 200, cy = 200
                const angle1 = (i * 30 - 90) * Math.PI / 180
                const angle2 = (next * 30 - 90) * Math.PI / 180
                const x1 = cx + r * Math.cos(angle1), y1 = cy + r * Math.sin(angle1)
                const x2 = cx + r * Math.cos(angle2), y2 = cy + r * Math.sin(angle2)
                const isAdj = selected === a.key || selected === ARCHETYPES[next].key
                return <line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isAdj ? 'var(--ark-gold-bright)' : 'var(--ark-border)'}
                  strokeWidth={isAdj ? 1.5 : 0.5} opacity={isAdj ? 0.8 : 0.3} />
              })}
            </svg>

            {/* Archetype nodes */}
            {ARCHETYPES.map((a, i) => {
              const angle = (i * 30 - 90) * Math.PI / 180
              const isSelected = selected === a.key
              const isHovered = hovered === a.key
              const color = ARCHETYPE_COLORS[a.key]

              return (
                <button
                  key={a.key}
                  className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                  style={{
                    left: `${50 + 40 * Math.cos(angle)}%`,
                    top: `${50 + 40 * Math.sin(angle)}%`,
                    transform: `translate(-50%, -50%) scale(${isSelected || isHovered ? 1.15 : 1})`,
                  }}
                  onMouseEnter={() => setHovered(a.key)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(selected === a.key ? null : a.key)}
                >
                  <div className={`w-[46px] h-[46px] md:w-[52px] md:h-[52px] rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'border-2' : 'border'
                  }`} style={{
                    borderColor: isSelected || isHovered ? color : 'var(--ark-border)',
                    background: isSelected ? `${color}20` : 'var(--ark-bg)',
                    boxShadow: isSelected ? `0 0 15px ${color}40` : isHovered ? `0 0 8px ${color}20` : 'none',
                    color: isSelected || isHovered ? color : 'var(--text-ghost)',
                  }}>
                    <ArchetypeSymbol type={a.key} size={22} />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Bottom panel */}
          <div className="mt-6 text-center max-w-sm">
            {activeData ? (
              <>
                <p className="text-lg font-display font-bold mb-1" style={{ color: ARCHETYPE_COLORS[activeData.key] }}>
                  {activeData.name}
                </p>
                <p className="text-xs font-body text-[var(--text-secondary)] mb-4">{activeData.desc}</p>
              </>
            ) : (
              <p className="text-xs font-body text-[var(--text-ghost)] mb-4 italic">Passe o cursor sobre um Arquétipo</p>
            )}

            {selected && (
              <ArkButton onClick={handleConfirm} disabled={confirming} className="w-full">
                {confirming ? 'Despertando...' : `Despertar ${ARCHETYPES.find((a) => a.key === selected)?.name}`}
              </ArkButton>
            )}
          </div>
        </div>
      )}

      {/* PHASE 3 — Confirmation */}
      {phase === 3 && selected && (
        <div className="text-center animate-pulse">
          <div className="mx-auto mb-4" style={{ color: ARCHETYPE_COLORS[selected] }}>
            <ArchetypeSymbol type={selected} size={80} />
          </div>
          <p className="text-lg font-display font-bold" style={{ color: ARCHETYPE_COLORS[selected] }}>
            {ARCHETYPES.find((a) => a.key === selected)?.name}
          </p>
          <p className="text-xs font-data text-[var(--text-label)] mt-2 uppercase tracking-wider">
            Ressonância despertada
          </p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'

const LINES = [
  'Durante anos, um Arquétipo dormiu dentro de você —',
  'silencioso, paciente, aguardando o momento certo.',
  'Esse momento chegou.',
  'O que sempre foi parte de você agora tem nome.',
]

export default function ResonanceEventModal() {
  const router = useRouter()
  const [closing, setClosing] = useState(false)
  const [entered, setEntered] = useState(false)
  const [visibleLines, setVisibleLines] = useState(0)
  const [showButton, setShowButton] = useState(false)

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Line-by-line reveal
  useEffect(() => {
    if (!entered) return
    // Start lines after header appears (800ms)
    const baseDelay = 800
    const timers: ReturnType<typeof setTimeout>[] = []
    LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), baseDelay + i * 900))
    })
    // Show button after all lines
    timers.push(setTimeout(() => setShowButton(true), baseDelay + LINES.length * 900 + 400))
    return () => timers.forEach(clearTimeout)
  }, [entered])

  const handleDismiss = async () => {
    setClosing(true)
    await fetch('/api/character/resonance-seen', { method: 'POST' })
    router.push('/character?tab=resonance')
    router.refresh()
  }

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        transition-all duration-700 ease-out
        ${entered ? 'bg-black/80 backdrop-blur-md' : 'bg-black/0 backdrop-blur-none'}
      `}
    >
      {/* Animated gold particles via CSS */}
      <style>{`
        @keyframes resonance-particle {
          0%   { transform: translateY(0) scale(0); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 0.6; }
          100% { transform: translateY(-120px) scale(1.2); opacity: 0; }
        }
        @keyframes resonance-float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        .resonance-particles::before,
        .resonance-particles::after,
        .resonance-particle-1,
        .resonance-particle-2,
        .resonance-particle-3,
        .resonance-particle-4,
        .resonance-particle-5 {
          content: '';
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--ark-gold-bright);
          animation: resonance-particle 3s ease-out infinite;
        }
        .resonance-particles::before { left: 20%; bottom: 10%; animation-delay: 0s; }
        .resonance-particles::after  { left: 75%; bottom: 15%; animation-delay: 0.8s; }
        .resonance-particle-1 { left: 40%; bottom: 5%;  animation-delay: 1.5s; width: 3px; height: 3px; }
        .resonance-particle-2 { left: 60%; bottom: 20%; animation-delay: 0.4s; width: 5px; height: 5px; }
        .resonance-particle-3 { left: 85%; bottom: 8%;  animation-delay: 2.1s; width: 3px; height: 3px; }
        .resonance-particle-4 { left: 10%; bottom: 25%; animation-delay: 1.2s; width: 2px; height: 2px; }
        .resonance-particle-5 { left: 50%; bottom: 12%; animation-delay: 0.6s; width: 4px; height: 4px; }
        .resonance-glow-pulse {
          animation: resonance-float 3s ease-in-out infinite;
        }
      `}</style>

      <div
        className={`
          max-w-lg mx-4 bg-[var(--ark-bg-raised)] border border-[var(--ark-gold)]/30 rounded-sm
          p-10 text-center relative overflow-hidden
          transition-all duration-700 ease-out
          resonance-particles
          ${entered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
        `}
      >
        {/* Particles */}
        <span className="resonance-particle-1 absolute" />
        <span className="resonance-particle-2 absolute" />
        <span className="resonance-particle-3 absolute" />
        <span className="resonance-particle-4 absolute" />
        <span className="resonance-particle-5 absolute" />

        {/* Glow background */}
        <div className="absolute inset-0 bg-gradient-radial from-[var(--ark-gold)]/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-[var(--ark-gold)]/5 blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          {/* Title — fades in */}
          <div
            className={`
              transition-all duration-1000 ease-out resonance-glow-pulse
              ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
          >
            <p className="text-2xl font-display font-bold text-[var(--ark-gold-bright)] mb-6 tracking-wide">
              Algo desperta...
            </p>
          </div>

          {/* Lines revealed one by one */}
          <div className="space-y-3 mb-8 min-h-[120px]">
            {LINES.map((line, i) => (
              <p
                key={i}
                className={`
                  text-sm font-body leading-relaxed transition-all duration-700 ease-out
                  ${i === 2
                    ? 'text-[var(--ark-gold-bright)] font-semibold mt-4'
                    : 'text-[var(--text-secondary)]'
                  }
                  ${i < visibleLines ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
                `}
              >
                {line}
              </p>
            ))}
          </div>

          {/* Button — appears last */}
          <div
            className={`
              transition-all duration-500 ease-out
              ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
            `}
          >
            <p className="text-[10px] font-data text-[var(--text-label)] mb-4 uppercase tracking-[0.2em]">
              Nível 5 atingido — Ressonância desbloqueada
            </p>
            <ArkButton onClick={handleDismiss} disabled={closing} className="w-full">
              {closing ? 'Abrindo...' : 'Descobrir minha Ressonância'}
            </ArkButton>
          </div>
        </div>
      </div>
    </div>
  )
}

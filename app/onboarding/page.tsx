'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import { Compass, User, ScrollText } from 'lucide-react'

const CARDS = [
  {
    eyebrow: 'O Mundo',
    title: 'Ellia acorda',
    body: `Ellia não foi criada — emergiu.\n\nQuando as doze forças primordiais colidiram no início dos tempos, o impacto não as destruiu. Criou um mundo. Um mundo-cicatriz, vivo e instável, onde o Éter permeia cada pedra, cada ser, cada intenção.\n\nVocê nasceu nesse mundo. E o mundo já sente sua presença.`,
  },
  {
    eyebrow: 'Quem você é',
    title: 'O Éter em você',
    body: `Não existe separação entre o mundano e o mágico em Ellia.\n\nUm guerreiro que empunha espada canaliza Éter através da lâmina. Um arqueiro carrega intenção espiritual em cada flecha. Um bardo reescreve estados de existência com frequências sonoras.\n\nVocê não escolheu ter poder. Você nasceu com ele.\nO que escolhe agora é como usá-lo.`,
  },
  {
    eyebrow: 'Seu destino',
    title: 'A Expedição Régia convoca',
    body: `Vallaeon — a cidade que fica no centro de tudo — emitiu um chamado. A Expedição Régia recruta aqueles com potencial etéreo acima do comum.\n\nVocê é um deles.\n\nO que a Expedição quer de você, ainda não está claro. O que você vai encontrar no caminho, ninguém pode prever. Mas a convocação chegou. E você veio.`,
  },
]

const STEPS = [
  { icon: Compass, label: 'Envie sua primeira expedição', description: 'Descubra o que existe além dos muros de Vallaeon.', href: '/expeditions' },
  { icon: User, label: 'Explore sua ficha', description: 'Seus atributos, skills e identidade esperam por você.', href: '/character' },
  { icon: ScrollText, label: 'Complete as tarefas do dia', description: 'Cada dia em Ellia traz novos desafios e recompensas.', href: '/home' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const [completing, setCompleting] = useState(false)

  const totalCards = CARDS.length + 1 // +1 for final card

  const goNext = () => {
    setVisible(false)
    setTimeout(() => {
      setCurrent((c) => c + 1)
      setVisible(true)
    }, 300)
  }

  const handleComplete = async () => {
    setCompleting(true)
    await fetch('/api/character/onboarding-complete', { method: 'POST' })
    router.push('/home')
  }

  // Check if already completed (client-side guard)
  useEffect(() => {
    fetch('/api/character/onboarding-complete')
      .then((r) => r.json())
      .then((d) => { if (d.completed) router.replace('/home') })
      .catch(() => {})
  }, [router])

  return (
    <main className="min-h-screen bg-[var(--ark-void)] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Particles */}
      <style>{`
        @keyframes ob-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-40px) translateX(10px); opacity: 0.7; }
        }
        .ob-particle { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--ark-gold-bright); }
        .ob-p1 { left: 15%; top: 70%; animation: ob-float 6s ease-in-out infinite; }
        .ob-p2 { left: 80%; top: 30%; animation: ob-float 8s ease-in-out infinite 1s; }
        .ob-p3 { left: 50%; top: 85%; animation: ob-float 7s ease-in-out infinite 2s; }
        .ob-p4 { left: 25%; top: 20%; animation: ob-float 9s ease-in-out infinite 0.5s; width: 2px; height: 2px; }
        .ob-p5 { left: 70%; top: 60%; animation: ob-float 5s ease-in-out infinite 3s; width: 4px; height: 4px; }
      `}</style>
      <span className="ob-particle ob-p1" />
      <span className="ob-particle ob-p2" />
      <span className="ob-particle ob-p3" />
      <span className="ob-particle ob-p4" />
      <span className="ob-particle ob-p5" />

      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[var(--ark-gold)]/5 blur-[100px] pointer-events-none" />

      <div className="max-w-xl w-full relative z-10">
        {/* Card content */}
        <div
          className={`transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {current < CARDS.length ? (
            <div className="text-center">
              <p className="text-[10px] font-data text-[var(--ark-gold-bright)] uppercase tracking-[0.2em] mb-3">
                {CARDS[current].eyebrow}
              </p>
              <h1 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-6">
                {CARDS[current].title}
              </h1>
              <div className="text-sm font-body text-[var(--text-secondary)] leading-relaxed whitespace-pre-line mb-8 max-w-md mx-auto">
                {CARDS[current].body}
              </div>
              <ArkButton onClick={goNext}>Continuar</ArkButton>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[10px] font-data text-[var(--ark-gold-bright)] uppercase tracking-[0.2em] mb-3">
                Sua jornada
              </p>
              <h1 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-6">
                Primeiros passos em Ellia
              </h1>
              <p className="text-sm font-body text-[var(--text-secondary)] mb-6">
                O mundo está aberto. Por onde começar?
              </p>

              <div className="space-y-3 mb-8 max-w-sm mx-auto text-left">
                {STEPS.map((step) => {
                  const Icon = step.icon
                  return (
                    <a
                      key={step.label}
                      href={step.href}
                      className="flex items-start gap-3 p-3 bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm hover:border-[var(--ark-border-bright)] transition-colors"
                    >
                      <Icon size={18} className="text-[var(--ark-gold-bright)] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-data font-semibold text-[var(--text-primary)]">{step.label}</p>
                        <p className="text-[11px] font-body text-[var(--text-label)] mt-0.5">{step.description}</p>
                      </div>
                    </a>
                  )
                })}
              </div>

              <ArkButton onClick={handleComplete} disabled={completing} className="w-full max-w-sm">
                {completing ? 'Entrando...' : 'Entrar em Ellia'}
              </ArkButton>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: totalCards }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-[var(--ark-gold-bright)] scale-110' : 'bg-[var(--text-ghost)]'}`}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

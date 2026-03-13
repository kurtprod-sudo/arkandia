import { type ReactNode } from 'react'

type BadgeColor =
  | 'crimson'
  | 'gold'
  | 'bronze'
  | 'profession'
  | 'society'
  | 'alive'
  | 'injured'
  | 'dead'
  | 'archetype'
  | 'ataque'
  | 'magia'
  | 'eter'
  | 'defesa'
  | 'vitalidade'
  | 'velocidade'
  | 'precisao'
  | 'tenacidade'
  | 'capitania'
  | 'moral'

interface ArkBadgeProps {
  children: ReactNode
  color?: BadgeColor
  icon?: ReactNode
  className?: string
}

const colorMap: Record<BadgeColor, string> = {
  crimson:   'bg-[#6e160f]/60 text-[var(--ark-red-glow)] border-[#6e160f]/40',
  gold:      'bg-[#3A2A18]/80 text-[var(--ark-gold-bright)] border-[#d3a539]/40',
  bronze:    'bg-[var(--ark-bg-raised)] text-[var(--text-label)] border-[var(--ark-gold-dim)]',
  profession:'bg-[var(--ark-bg-raised)] text-[var(--text-label)] border-[var(--ark-gold-dim)]',
  society:   'bg-[var(--ark-bg-raised)] text-[var(--text-secondary)] border-[var(--ark-gold)]',
  alive:     'bg-emerald-950/50 text-status-alive border-emerald-800/40',
  injured:   'bg-amber-950/50 text-status-injured border-amber-800/40',
  dead:      'bg-red-950/60 text-status-dead border-red-900/40',
  archetype: 'bg-attr-capitania/20 text-attr-capitania border-attr-capitania/40',
  ataque:    'bg-red-950/40 text-attr-ataque border-red-800/30',
  magia:     'bg-indigo-950/40 text-attr-magia border-indigo-800/30',
  eter:      'bg-cyan-950/40 text-attr-eter border-cyan-800/30',
  defesa:    'bg-slate-900/40 text-attr-defesa border-slate-700/30',
  vitalidade:'bg-green-950/40 text-attr-vitalidade border-green-800/30',
  velocidade:'bg-yellow-950/40 text-attr-velocidade border-yellow-800/30',
  precisao:  'bg-orange-950/40 text-attr-precisao border-orange-800/30',
  tenacidade:'bg-stone-900/40 text-attr-tenacidade border-stone-700/30',
  capitania: 'bg-purple-950/40 text-attr-capitania border-purple-800/30',
  moral:     'bg-pink-950/40 text-attr-moral border-pink-800/30',
}

export default function ArkBadge({
  children,
  color = 'gold',
  icon,
  className = '',
}: ArkBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-3 py-0.5 rounded-sm
        text-xs font-data font-semibold tracking-wider uppercase
        border
        ${colorMap[color]}
        ${className}
      `}
    >
      {icon && <span className="w-3.5 h-3.5 flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

import { type ReactNode } from 'react'

type BadgeColor =
  | 'wine'
  | 'bronze'
  | 'gold'
  | 'alive'
  | 'injured'
  | 'dead'
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
  wine: 'bg-wine-dark/60 text-wine-glow border-wine-mid/40',
  bronze: 'bg-bronze-dark/40 text-bronze-glow border-bronze-mid/30',
  gold: 'bg-yellow-950/40 text-gold-pure border-yellow-700/30',
  alive: 'bg-emerald-950/50 text-status-alive border-emerald-800/40',
  injured: 'bg-amber-950/50 text-status-injured border-amber-800/40',
  dead: 'bg-red-950/60 text-status-dead border-red-900/40',
  ataque: 'bg-red-950/40 text-attr-ataque border-red-800/30',
  magia: 'bg-indigo-950/40 text-attr-magia border-indigo-800/30',
  eter: 'bg-cyan-950/40 text-attr-eter border-cyan-800/30',
  defesa: 'bg-slate-900/40 text-attr-defesa border-slate-700/30',
  vitalidade: 'bg-green-950/40 text-attr-vitalidade border-green-800/30',
  velocidade: 'bg-yellow-950/40 text-attr-velocidade border-yellow-800/30',
  precisao: 'bg-orange-950/40 text-attr-precisao border-orange-800/30',
  tenacidade: 'bg-stone-900/40 text-attr-tenacidade border-stone-700/30',
  capitania: 'bg-purple-950/40 text-attr-capitania border-purple-800/30',
  moral: 'bg-pink-950/40 text-attr-moral border-pink-800/30',
}

export default function ArkBadge({
  children,
  color = 'bronze',
  icon,
  className = '',
}: ArkBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        text-xs font-data font-semibold
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

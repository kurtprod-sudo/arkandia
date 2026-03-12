interface IconProps {
  className?: string
  size?: number
}

function makeIcon(d: string, viewBox = '0 0 24 24') {
  return function ArkIcon({ className = '', size = 18 }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d={d} />
      </svg>
    )
  }
}

/** Ataque — crossed swords */
export const SwordIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6" />
    <path d="M16 16l4 4" />
    <path d="M19 21l2-2" />
  </svg>
)

/** Magia — estrela arcana */
export const MagicIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5L18.2 21 12 16.5 5.8 21l2.4-7.1L2 9.4h7.6z" />
  </svg>
)

/** Éter — gota cristalina */
export const DropletIcon = makeIcon('M12 2.69l5.66 5.66a8 8 0 11-11.31 0z')

/** Defesa — escudo */
export const ShieldIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

/** Vitalidade — coração */
export const HeartIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
  </svg>
)

/** Velocidade — raio */
export const ZapIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

/** Precisao — alvo */
export const TargetIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
)

/** Tenacidade — âncora */
export const AnchorIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="5" r="3" />
    <line x1="12" y1="22" x2="12" y2="8" />
    <path d="M5 12H2a10 10 0 0020 0h-3" />
  </svg>
)

/** Capitania — coroa */
export const CrownIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 20h20L19 8l-5 5-2-7-2 7-5-5z" />
  </svg>
)

/** Moral — chama */
export const FlameIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 2-6.5 0 3.5 2 5.14 3.5 7.5S17 14.5 17 17a5 5 0 01-10 0c0-1 .5-2 1.5-2.5z" />
  </svg>
)

/** Libras — moeda */
export const CoinIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12h6" />
    <path d="M12 9v6" />
  </svg>
)

/** Essencia — cristal */
export const CrystalIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 17 7 17 17 12 22 7 17 7 7 12 2" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="7" y1="7" x2="17" y2="7" />
    <line x1="7" y1="17" x2="17" y2="17" />
  </svg>
)

/** Premium — diamante */
export const DiamondIcon = ({ className = '', size = 18 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2.7 10.3l8.6 10.4a1 1 0 001.4 0l8.6-10.4a1 1 0 00.1-1.1l-3.3-5.7a1 1 0 00-.9-.5H6.8a1 1 0 00-.9.5L2.6 9.2a1 1 0 00.1 1.1z" />
    <path d="M2 10h20" />
    <path d="M12 21L8 10" />
    <path d="M12 21l4-11" />
    <path d="M8 3l-2 7" />
    <path d="M16 3l2 7" />
  </svg>
)

/** Map de ícone por atributo (conveniência) */
export const ATTR_ICONS = {
  ataque: SwordIcon,
  magia: MagicIcon,
  eter: DropletIcon,
  eter_max: DropletIcon,
  defesa: ShieldIcon,
  vitalidade: HeartIcon,
  velocidade: ZapIcon,
  precisao: TargetIcon,
  tenacidade: AnchorIcon,
  capitania: CrownIcon,
  moral: FlameIcon,
} as const

export const CURRENCY_ICONS = {
  libras: CoinIcon,
  essencia: CrystalIcon,
  premium_currency: DiamondIcon,
} as const

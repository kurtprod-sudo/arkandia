import Link from 'next/link'
import ArkDivider from '@/components/ui/ArkDivider'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle radial background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-wine-dark/20 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-bronze-dark/15 blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Title */}
        <h1 className="font-display text-6xl md:text-7xl font-bold text-gold-pure text-glow-bronze mb-3 tracking-wide">
          Arkandia
        </h1>
        <p className="font-body text-xl text-bronze-light tracking-widest uppercase mb-1">
          RPG Híbrido
        </p>

        <ArkDivider className="w-64 my-6" />

        <p className="text-ark-text-secondary text-sm max-w-md text-center font-body leading-relaxed mb-10">
          Forje seu legado no mundo onde a web é o motor de regras
          e Habbo Hotel é o palco social.
        </p>

        {/* CTAs */}
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="
              px-8 py-3 rounded-lg font-body font-semibold
              bg-gradient-to-r from-wine-dark to-wine-mid
              text-bronze-glow border border-bronze-mid/30
              hover:from-wine-mid hover:to-wine-light hover:shadow-glow-wine
              transition-all duration-200
            "
          >
            Entrar
          </Link>
          <Link
            href="/auth/register"
            className="
              px-8 py-3 rounded-lg font-body font-semibold
              bg-transparent border border-bronze-mid/50
              text-bronze-light
              hover:bg-bronze-dark/20 hover:border-bronze-light/60 hover:text-bronze-glow
              transition-all duration-200
            "
          >
            Registrar
          </Link>
        </div>
      </div>
    </main>
  )
}

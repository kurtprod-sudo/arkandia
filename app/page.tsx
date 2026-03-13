import Link from 'next/link'
import ArkDivider from '@/components/ui/ArkDivider'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle radial background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#6e160f]/20 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[#3A2A18]/30 blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Title */}
        <h1 className="font-display text-6xl md:text-7xl font-bold text-[var(--ark-gold-bright)] text-glow-gold mb-3 tracking-wide">
          Arkandia
        </h1>
        <p className="font-body text-xl text-[var(--ark-gold-bright)] tracking-widest uppercase mb-1">
          RPG Híbrido
        </p>

        <ArkDivider className="w-64 my-6" />

        <p className="text-[var(--text-secondary)] text-sm max-w-md text-center font-body leading-relaxed mb-10">
          Forje seu legado no mundo onde a web é o motor de regras
          e Habbo Hotel é o palco social.
        </p>

        {/* CTAs */}
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="
              px-8 py-3 rounded-sm font-data font-semibold tracking-widest uppercase text-xs
              bg-[var(--text-ghost)] text-[var(--ark-gold-bright)] border border-[var(--ark-gold)]
              hover:border-[#f0c84a]/50 transition-all duration-200
            "
          >
            Entrar
          </Link>
          <Link
            href="/auth/register"
            className="
              px-8 py-3 rounded-sm font-data font-semibold tracking-widest uppercase text-xs
              bg-transparent border border-[var(--ark-gold-dim)] text-[var(--text-secondary)]
              hover:border-[var(--ark-gold)] hover:text-[var(--ark-gold-bright)] transition-all duration-200
            "
          >
            Registrar
          </Link>
        </div>
      </div>
    </main>
  )
}

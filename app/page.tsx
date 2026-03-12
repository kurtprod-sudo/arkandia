import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white px-4">
      <h1 className="text-6xl font-bold text-amber-400 mb-4 tracking-tight">Arkandia</h1>
      <p className="text-neutral-400 text-xl mb-2">RPG Híbrido</p>
      <p className="text-neutral-600 text-sm mb-10 max-w-md text-center">
        Forje seu legado no mundo onde a web é o motor de regras e Habbo Hotel é o palco social.
      </p>
      <div className="flex gap-4">
        <Link
          href="/auth/login"
          className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors"
        >
          Entrar
        </Link>
        <Link
          href="/auth/register"
          className="px-8 py-3 border border-neutral-700 hover:border-neutral-500 text-neutral-300 rounded-lg transition-colors"
        >
          Registrar
        </Link>
      </div>
    </main>
  )
}

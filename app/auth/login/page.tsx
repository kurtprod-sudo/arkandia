import Link from 'next/link'
import { login } from '../actions'
import AuthForm from '@/components/ui/AuthForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="w-full max-w-md px-6">
        <h1 className="text-3xl font-bold text-amber-400 text-center mb-2">Arkandia</h1>
        <p className="text-neutral-400 text-center mb-8">Entre no mundo</p>

        <AuthForm action={login} submitLabel="Entrar">
          <div>
            <label className="block text-sm text-neutral-300 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 rounded bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-2 rounded bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </AuthForm>

        <p className="text-center text-neutral-500 mt-4 text-sm">
          Não tem conta?{' '}
          <Link href="/auth/register" className="text-amber-400 hover:underline">
            Registrar
          </Link>
        </p>
      </div>
    </main>
  )
}

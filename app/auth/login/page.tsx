import Link from 'next/link'
import { login } from '../actions'
import AuthForm from '@/components/ui/AuthForm'
import ArkInput from '@/components/ui/ArkInput'
import ArkDivider from '@/components/ui/ArkDivider'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-wine-dark/15 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <h1 className="font-display text-3xl font-bold text-gold-pure text-glow-bronze text-center mb-1">
          Arkandia
        </h1>
        <p className="text-ark-text-secondary text-center font-body text-sm mb-2">
          Entre no mundo
        </p>
        <ArkDivider className="w-48 mx-auto mb-8" />

        <div className="bg-ark-bg-secondary border border-bronze-dark/25 rounded-xl p-6">
          <AuthForm action={login} submitLabel="Entrar">
            <ArkInput id="email" name="email" type="email" label="Email" required />
            <ArkInput id="password" name="password" type="password" label="Senha" required />
          </AuthForm>
        </div>

        <p className="text-center text-ark-text-muted mt-5 text-sm font-body">
          Não tem conta?{' '}
          <Link href="/auth/register" className="text-bronze-light hover:text-bronze-glow transition-colors">
            Registrar
          </Link>
        </p>
      </div>
    </main>
  )
}

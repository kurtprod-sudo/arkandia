import Link from 'next/link'
import { register } from '../actions'
import AuthForm from '@/components/ui/AuthForm'
import ArkInput from '@/components/ui/ArkInput'
import ArkDivider from '@/components/ui/ArkDivider'

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#6e160f]/15 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <h1 className="font-display text-3xl font-bold text-[var(--ark-gold-bright)] text-glow-gold text-center mb-1">
          Arkandia
        </h1>
        <p className="text-[var(--text-secondary)] text-center font-body text-sm mb-2">
          Crie sua conta
        </p>
        <ArkDivider className="w-48 mx-auto mb-8" />

        <div className="bg-[var(--ark-bg-raised)] border border-[var(--ark-gold-dim)] rounded-xl p-6">
          <AuthForm action={register} submitLabel="Criar Conta">
            <ArkInput
              id="username"
              name="username"
              type="text"
              label="Nome de usuário"
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]+"
              title="Apenas letras, números e underscore"
            />
            <ArkInput id="email" name="email" type="email" label="Email" required />
            <ArkInput id="password" name="password" type="password" label="Senha" required minLength={8} />
          </AuthForm>
        </div>

        <p className="text-center text-[var(--text-label)] mt-5 text-sm font-body">
          Já tem conta?{' '}
          <Link href="/auth/login" className="text-[var(--ark-gold-bright)] hover:text-[var(--ark-gold-bright)] transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}

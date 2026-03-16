import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import ArkButton from '@/components/ui/ArkButton'

export default async function BannedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_banned, banned_until, ban_reason')
    .eq('id', user.id)
    .single()

  if (!profile?.is_banned) redirect('/home')

  const isPermanent = !profile.banned_until
  const banDate = profile.banned_until
    ? new Date(profile.banned_until).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--ark-void)] px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-display font-bold text-[var(--ark-red-glow)] mb-2">
          Acesso Suspenso
        </h1>
        <p className="text-sm font-body text-[var(--text-secondary)] mb-6">
          Sua conta foi suspensa pelo GM de Arkandia.
        </p>

        {isPermanent ? (
          <p className="text-xs font-data text-[var(--text-label)] mb-4">
            Esta suspensão é permanente.
          </p>
        ) : (
          <p className="text-xs font-data text-[var(--text-label)] mb-4">
            Sua suspensão expira em {banDate}.
          </p>
        )}

        {profile.ban_reason && (
          <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 mb-6">
            <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-1">Motivo</p>
            <p className="text-sm font-body text-[var(--text-secondary)]">{profile.ban_reason}</p>
          </div>
        )}

        <p className="text-xs font-body text-[var(--text-ghost)] mb-6">
          Se acredita que houve um erro, entre em contato com a administração.
        </p>

        <form action={logout}>
          <ArkButton variant="secondary" className="w-full">Sair</ArkButton>
        </form>
      </div>
    </main>
  )
}

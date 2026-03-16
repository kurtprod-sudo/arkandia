import { createClient } from '@/lib/supabase/server'
import AppShell from './AppShell'
import AchievementToast from '@/components/ui/AchievementToast'

const NO_SHELL_ROUTES = ['/', '/auth', '/character/create', '/banned', '/onboarding', '/terms', '/privacy']

interface AppShellWrapperProps {
  children: React.ReactNode
  pathname: string
}

export default async function AppShellWrapper({ children, pathname }: AppShellWrapperProps) {
  // Check if this route should skip AppShell
  const skipShell = NO_SHELL_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )

  if (skipShell) return <>{children}</>

  // Check auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <>{children}</>

  // Get character + profile data
  const [{ data: profile }, { data: character }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('characters').select('id, name').eq('user_id', user.id).single(),
  ])

  return (
    <AppShell
      characterId={character?.id ?? null}
      characterInitial={character?.name?.charAt(0) ?? '?'}
      isGm={profile?.role === 'gm'}
    >
      {children}
      <AchievementToast characterId={character?.id ?? null} />
    </AppShell>
  )
}

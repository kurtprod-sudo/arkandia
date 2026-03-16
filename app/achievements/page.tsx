import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCharacterAchievements } from '@/lib/game/achievements'
import ArkDivider from '@/components/ui/ArkDivider'
import AchievementGrid from './AchievementGrid'

export default async function AchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) redirect('/character/create')

  const achievements = await getCharacterAchievements(character.id)
  const unlockedCount = achievements.filter((a) => a.unlockedAt).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Conquistas
        </h1>
        <span className="text-xs font-data text-[var(--text-label)]">
          {unlockedCount} / {achievements.length} desbloqueadas
        </span>
      </div>
      <ArkDivider variant="dark" className="mb-6" />

      <AchievementGrid achievements={achievements} />
    </div>
  )
}

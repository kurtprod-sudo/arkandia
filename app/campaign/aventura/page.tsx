import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageProgress, getChapterStages, getLoreFragments, isCampaignUnlocked, getChapterNation } from '@/lib/game/campaign_long'
import ArkDivider from '@/components/ui/ArkDivider'
import AventuraChapterTabs from '@/components/campaign/AventuraChapterTabs'

export default async function AventuraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) redirect('/character/create')

  const unlocked = await isCampaignUnlocked(character.id, 'aventura')
  if (!unlocked) redirect('/campaign')

  const [ch1Stages, ch2Stages, ch3Stages, loreFragments, progress] = await Promise.all([
    getChapterStages(character.id, 'aventura', 1),
    getChapterStages(character.id, 'aventura', 2),
    getChapterStages(character.id, 'aventura', 3),
    getLoreFragments(character.id),
    getStageProgress(character.id, 'aventura'),
  ])

  const normalCount = progress.filter((p) => p.difficulty === 'normal').length

  const chapters = [
    { chapterNumber: 1, nation: getChapterNation(1), title: 'Sombras de Valoria', stages: ch1Stages },
    { chapterNumber: 2, nation: getChapterNation(2), title: 'O Véu de Eryuell', stages: ch2Stages },
    { chapterNumber: 3, nation: getChapterNation(3), title: 'A Chama de Düren', stages: ch3Stages },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
          A Aventura Começa
        </h1>
        <span className="text-xs font-data text-[var(--text-label)]">
          {normalCount}/30 fases
        </span>
      </div>
      <p className="text-xs font-body text-[var(--text-secondary)] mb-2">
        Três continentes. Trinta batalhas. Cada nação guarda segredos e inimigos únicos.
      </p>
      <ArkDivider variant="dark" className="mb-6" />

      <AventuraChapterTabs chapters={chapters} loreFragments={loreFragments} />
    </div>
  )
}

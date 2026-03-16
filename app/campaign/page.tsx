import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCampaignChapters, getCampaignProgress } from '@/lib/game/campaign'
import { isCampaignUnlocked, getStageProgress, getChapterNation } from '@/lib/game/campaign_long'
import ArkDivider from '@/components/ui/ArkDivider'
import CampaignPanel from '@/components/campaign/CampaignPanel'
import CampaignMapSection from '@/components/campaign/CampaignMapSection'
import { Lock } from 'lucide-react'

export default async function CampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) redirect('/character/create')

  const [chapters, progress, aventuraUnlocked] = await Promise.all([
    getCampaignChapters('inicial'),
    getCampaignProgress(character.id, 'inicial'),
    isCampaignUnlocked(character.id, 'aventura'),
  ])

  // Aventura progress (only if unlocked)
  const aventuraProgress = aventuraUnlocked
    ? await getStageProgress(character.id, 'aventura')
    : []

  // Build chapter statuses for world map
  const mapChapters = [1, 2, 3].map((ch) => {
    const normalCompleted = aventuraProgress.filter(
      (p) => p.chapterNumber === ch && p.difficulty === 'normal'
    ).length

    let status: 'locked' | 'available' | 'in_progress' | 'completed' = 'locked'
    if (aventuraUnlocked) {
      if (normalCompleted >= 10) {
        status = 'completed'
      } else if (normalCompleted > 0) {
        status = 'in_progress'
      } else if (ch === 1) {
        status = 'available'
      } else {
        // Check if previous chapter is complete
        const prevNormal = aventuraProgress.filter(
          (p) => p.chapterNumber === ch - 1 && p.difficulty === 'normal'
        ).length
        status = prevNormal >= 10 ? 'available' : 'locked'
      }
    }

    return {
      chapterNumber: ch,
      nation: getChapterNation(ch),
      status,
      stagesCompleted: normalCompleted,
    }
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {/* Section 1: Campanha Inicial */}
      <section>
        <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
          Expedição Régia
        </h1>
        <p className="text-xs font-body text-[var(--text-secondary)] mb-2">
          Sua jornada em Ellia. 10 capítulos com narrativa, escolhas e combate.
        </p>
        <ArkDivider variant="dark" className="mb-6" />
        <CampaignPanel chapters={chapters} progress={progress} campaignSlug="inicial" />
      </section>

      {/* Section 2: Campanha Longa */}
      <section>
        <h2 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
          A Aventura Começa
        </h2>
        <p className="text-xs font-body text-[var(--text-secondary)] mb-2">
          Três continentes. Trinta batalhas. Um destino.
        </p>
        <ArkDivider variant="dark" className="mb-4" />

        {aventuraUnlocked ? (
          <div className="space-y-4">
            <CampaignMapSection chapters={mapChapters} />
            <Link
              href="/campaign/aventura"
              className="block w-full text-center px-5 py-2.5 bg-[var(--ark-accent)] text-[var(--ark-bg)] text-xs font-data font-semibold uppercase tracking-wider rounded-sm hover:brightness-110 transition"
            >
              Entrar na Aventura
            </Link>
          </div>
        ) : (
          <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-6 text-center">
            <Lock size={24} className="text-[var(--text-label)] mx-auto mb-2" />
            <p className="text-xs font-body text-[var(--text-label)]">
              Complete a Expedição Régia para desbloquear a Campanha Longa.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

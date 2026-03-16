'use client'

import { useRouter } from 'next/navigation'
import CampaignWorldMap from './CampaignWorldMap'

interface ChapterNode {
  chapterNumber: number
  nation: string
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  stagesCompleted: number
}

export default function CampaignMapSection({ chapters }: { chapters: ChapterNode[] }) {
  const router = useRouter()

  function handleChapterClick(chapterNumber: number) {
    router.push(`/campaign/aventura?ch=${chapterNumber}`)
  }

  return <CampaignWorldMap chapters={chapters} onChapterClick={handleChapterClick} />
}

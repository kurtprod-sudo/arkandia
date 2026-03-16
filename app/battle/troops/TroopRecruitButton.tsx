'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import { enqueueRecruitmentAction } from '@/app/actions/troops'
import type { TroopType } from '@/lib/game/troops'

export default function TroopRecruitButton({ troopType }: { troopType: TroopType }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    await enqueueRecruitmentAction(troopType)
    router.refresh()
    setLoading(false)
  }

  return (
    <ArkButton size="sm" onClick={handle} disabled={loading}>
      {loading ? '...' : 'Recrutar'}
    </ArkButton>
  )
}

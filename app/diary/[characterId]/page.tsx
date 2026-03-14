import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DiaryPanel from '@/components/diary/DiaryPanel'

interface DiaryPageProps {
  params: Promise<{ characterId: string }>
}

export default async function DiaryPage({ params }: DiaryPageProps) {
  const { characterId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Busca personagem alvo
  const { data: character } = await supabase
    .from('characters')
    .select('id, name, title, avatar_url, level')
    .eq('id', characterId)
    .single()

  if (!character) notFound()

  // Busca entradas com reações
  const { data: entriesRaw } = await supabase
    .from('diary_entries')
    .select('*, diary_reactions(symbol, character_id)')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(30)

  // Busca personagem do usuário logado (para reações e owner check)
  const { data: myChar } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isOwner = myChar?.id === character.id

  // Map entries
  const entries = (entriesRaw ?? []).map((e) => {
    const reactions = (e.diary_reactions as Array<{ symbol: string; character_id: string }>) ?? []
    const reactionCounts: Record<string, number> = {}
    let myReaction: string | null = null
    for (const r of reactions) {
      reactionCounts[r.symbol] = (reactionCounts[r.symbol] ?? 0) + 1
      if (myChar && r.character_id === myChar.id) {
        myReaction = r.symbol
      }
    }
    return {
      id: e.id as string,
      title: e.title as string,
      content: e.content as string,
      isLoreConfirmed: (e.is_lore_confirmed as boolean) ?? false,
      createdAt: (e.created_at as string) ?? '',
      reactionCounts,
      myReaction,
    }
  })

  return (
    <main className="min-h-screen px-4 py-8 relative bg-[var(--ark-void)]">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[var(--ark-red)]/8 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <DiaryPanel
          characterId={character.id}
          characterName={character.name}
          characterTitle={(character.title as string) ?? null}
          characterAvatarUrl={(character.avatar_url as string) ?? null}
          entries={entries}
          isOwner={isOwner}
          myCharacterId={myChar?.id ?? null}
        />
      </div>
    </main>
  )
}

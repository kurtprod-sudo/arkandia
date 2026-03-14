import { createClient } from '@/lib/supabase/server'
import RankingsTabs from '@/components/rankings/RankingsTabs'

export default async function RankingsPage() {
  const supabase = await createClient()

  const [
    { data: guerreiros },
    { data: sociedades },
    { data: exploradores },
    { data: heroisGuerra },
  ] = await Promise.all([
    supabase.from('rankings').select('*')
      .eq('category', 'maiores_guerreiros')
      .order('rank_position').limit(20),
    supabase.from('rankings').select('*')
      .eq('category', 'sociedades_dominantes')
      .order('rank_position').limit(20),
    supabase.from('rankings').select('*')
      .eq('category', 'exploradores')
      .order('rank_position').limit(20),
    supabase.from('rankings').select('*')
      .eq('category', 'herois_guerra')
      .order('rank_position').limit(20),
  ])

  const mapEntries = (data: typeof guerreiros) =>
    (data ?? []).map((r) => ({
      id: r.id,
      entityName: r.entity_name,
      entityType: r.entity_type as 'character' | 'society',
      score: r.score,
      rankPosition: r.rank_position ?? 0,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      updatedAt: r.updated_at ?? '',
    }))

  return (
    <div className="min-h-screen bg-[var(--ark-bg)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Rankings de Arkandia
        </h1>

        <RankingsTabs
          guerreiros={mapEntries(guerreiros)}
          sociedades={mapEntries(sociedades)}
          exploradores={mapEntries(exploradores)}
          heroisGuerra={mapEntries(heroisGuerra)}
        />
      </div>
    </div>
  )
}

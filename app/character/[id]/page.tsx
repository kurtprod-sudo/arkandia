import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_LABELS = {
  active: 'Vivo',
  injured: 'Ferido',
  dead: 'Morto',
}


const PROFESSION_LABELS: Record<string, string> = {
  comerciante: 'Comerciante', militar: 'Militar', clerigo: 'Clérigo',
  explorador: 'Explorador', artesao: 'Artesão', erudito: 'Erudito',
  nobre: 'Nobre', mercenario: 'Mercenário',
}

export default async function PublicCharacterPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select(`
      id,
      name,
      level,
      status,
      title,
      profession,
      archetype,
      societies (name)
    `)
    .eq('id', id)
    .single()

  if (!character) notFound()

  const society = character.societies as { name: string } | null

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 rounded-xl p-8 border border-neutral-800">
          {/* Nome e título */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-amber-400">{character.name}</h1>
            {character.title && (
              <p className="text-neutral-400 italic mt-1">&quot;{character.title}&quot;</p>
            )}
          </div>

          {/* Status vital */}
          <div className="flex justify-center mb-6">
            <span
              className={`px-4 py-1 rounded-full border text-sm font-semibold ${
                character.status === 'active'
                  ? 'border-green-700 bg-green-950/30 text-green-400'
                  : character.status === 'injured'
                  ? 'border-yellow-700 bg-yellow-950/30 text-yellow-400'
                  : 'border-red-700 bg-red-950/30 text-red-400'
              }`}
            >
              {STATUS_LABELS[character.status]}
            </span>
          </div>

          {/* Informações públicas */}
          <div className="space-y-3">
            <InfoRow label="Nível" value={String(character.level)} />
            <InfoRow label="Profissão" value={PROFESSION_LABELS[character.profession] ?? character.profession} />
            {character.archetype && (
              <InfoRow
                label="Arquétipo"
                value={character.archetype.charAt(0).toUpperCase() + character.archetype.slice(1)}
                valueClass="text-purple-400"
              />
            )}
            <InfoRow
              label="Sociedade"
              value={society?.name ?? '—'}
              valueClass={society ? 'text-white' : 'text-neutral-600'}
            />
          </div>

          {/* Nota de privacidade */}
          <p className="text-xs text-neutral-600 text-center mt-6">
            Atributos, HP, Éter e Habilidades são informação privada.
          </p>
        </div>
      </div>
    </main>
  )
}

function InfoRow({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex justify-between border-b border-neutral-800 pb-2">
      <span className="text-neutral-400 text-sm">{label}</span>
      <span className={`font-semibold text-sm ${valueClass}`}>{value}</span>
    </div>
  )
}

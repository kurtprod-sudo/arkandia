import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canChooseArchetype, canChooseClass } from '@/lib/game/xp'
import CharacterSheet from '@/components/character/CharacterSheet'

export default async function CharacterSheetPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: charCheck } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!charCheck) redirect('/character/create')

  const characterId = charCheck.id

  const [
    { data: character, error: charError },
    { data: attrs, error: attrsError },
    { data: wallet, error: walletError },
  ] = await Promise.all([
    supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .maybeSingle(),
    supabase
      .from('character_attributes')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle(),
    supabase
      .from('character_wallet')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle(),
  ])

  if (process.env.NODE_ENV === 'development') {
    if (charError) console.error('[/character] characters error:', charError)
    if (attrsError) console.error('[/character] character_attributes error:', attrsError)
    if (walletError) console.error('[/character] character_wallet error:', walletError)
    console.log('[/character] character:', character?.name, '| attrs:', !!attrs, '| wallet:', !!wallet)
  }

  if (!character) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-3 font-body">Erro ao carregar personagem.</p>
          <a href="/character" className="text-[#d3a539] hover:text-[#f0c84a] underline text-sm font-body">
            Tentar novamente
          </a>
        </div>
      </main>
    )
  }

  if (!attrs || !wallet) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-3 font-body">Inicializando personagem...</p>
          <a href="/character" className="text-[#d3a539] hover:text-[#f0c84a] underline text-sm font-body">
            Clique para continuar
          </a>
        </div>
      </main>
    )
  }

  let societyName: string | null = null
  if (character.society_id) {
    const { data: society } = await supabase
      .from('societies')
      .select('name')
      .eq('id', character.society_id)
      .maybeSingle()
    societyName = society?.name ?? null
  }

  return (
    <main className="min-h-screen px-4 py-8 relative bg-[var(--ark-void)]">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[var(--ark-red)]/8 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[var(--ark-gold)]/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        <CharacterSheet
          character={character as unknown as import('@/types').Character}
          attrs={attrs}
          wallet={wallet}
          societyName={societyName}
        />

        {/* Milestone alerts */}
        {canChooseArchetype(character.level) && !character.archetype && (
          <div className="max-w-5xl mx-auto mt-6 p-4 bg-attr-capitania/10 border border-attr-capitania/30 rounded-lg">
            <p className="text-attr-capitania text-sm font-body font-semibold">
              Nível 5 atingido — escolha seu Arquétipo de Ressonância!
            </p>
          </div>
        )}
        {canChooseClass(character.level) && !character.class_id && (
          <div className="max-w-5xl mx-auto mt-2 p-4 bg-attr-eter/10 border border-attr-eter/30 rounded-lg">
            <p className="text-attr-eter text-sm font-body font-semibold">
              Nível 10 atingido — escolha sua Classe!
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

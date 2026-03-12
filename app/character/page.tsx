import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { xpToNextLevel, canChooseArchetype, canChooseClass } from '@/lib/game/xp'
import AttributeDistributor from '@/components/character/AttributeDistributor'
import StatBar from '@/components/ui/StatBar'


export default async function CharacterSheetPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // -------------------------------------------------------------------------
  // Passo 1: verifica existência com query simples (sem joins, sem RLS de
  // tabelas relacionadas). Garante que o redirect para /create só dispara
  // quando o personagem de fato não existe — não por falha de join/RLS.
  // Isso quebra o loop: /character → /create → /character → ...
  // -------------------------------------------------------------------------
  const { data: charCheck } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!charCheck) redirect('/character/create')

  // -------------------------------------------------------------------------
  // Passo 2: queries separadas por tabela.
  // Evita dois problemas de join:
  //   a) Ambiguidade de FK em societies (characters.society_id ↔ societies.leader_id)
  //      que faz o PostgREST retornar erro "more than one relationship was found"
  //   b) Políticas RLS que usam sub-queries (get_my_character_id) podem não
  //      resolver corretamente no contexto de um join composto
  // -------------------------------------------------------------------------
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

  // Debug: aparece no terminal do Next.js dev server
  if (process.env.NODE_ENV === 'development') {
    if (charError) console.error('[/character] characters error:', charError)
    if (attrsError) console.error('[/character] character_attributes error:', attrsError)
    if (walletError) console.error('[/character] character_wallet error:', walletError)
    console.log('[/character] character:', character?.name, '| attrs:', !!attrs, '| wallet:', !!wallet)
  }

  if (!character) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400 mb-3">Erro ao carregar personagem.</p>
          <a href="/character" className="text-amber-400 underline text-sm">
            Tentar novamente
          </a>
        </div>
      </main>
    )
  }

  // Atributos ainda não inicializados (trigger de criação ainda executando)
  if (!attrs || !wallet) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400 mb-3">Inicializando personagem...</p>
          <a href="/character" className="text-amber-400 underline text-sm">
            Clique para continuar
          </a>
        </div>
      </main>
    )
  }

  // Busca nome da sociedade separado (evita ambiguidade de FK no join)
  let societyName: string | null = null
  if (character.society_id) {
    const { data: society } = await supabase
      .from('societies')
      .select('name')
      .eq('id', character.society_id)
      .maybeSingle()
    societyName = society?.name ?? null
  }
  const xpNeeded = xpToNextLevel(character.level)
  const xpPercent = Math.min(100, (character.xp / xpNeeded) * 100)

  const STATUS_LABELS = {
    active: 'Vivo',
    injured: 'Ferido',
    dead: 'Morto',
  } as const

  const STATUS_COLORS = {
    active: 'text-green-400',
    injured: 'text-yellow-400',
    dead: 'text-red-400',
  } as const

  const PROFESSION_LABELS: Record<string, string> = {
    comerciante: 'Comerciante', militar: 'Militar', clerigo: 'Clérigo',
    explorador: 'Explorador', artesao: 'Artesão', erudito: 'Erudito',
    nobre: 'Nobre', mercenario: 'Mercenário',
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-amber-400">{character.name}</h1>
              {character.title && (
                <p className="text-neutral-400 text-sm italic">&quot;{character.title}&quot;</p>
              )}
              <p className="text-neutral-400 mt-1">
                {PROFESSION_LABELS[character.profession]} •{' '}
                {character.archetype ? (
                  <span className="text-purple-400 capitalize">{character.archetype}</span>
                ) : (
                  <span className="text-neutral-600">Sem Arquétipo</span>
                )}
              </p>
              {societyName && (
                <p className="text-neutral-400 text-sm mt-1">
                  Sociedade: <span className="text-white">{societyName}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">Nv {character.level}</p>
              <p className={`font-semibold ${STATUS_COLORS[character.status]}`}>
                {STATUS_LABELS[character.status]}
              </p>
            </div>
          </div>

          {/* XP Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>XP</span>
              <span>{character.xp} / {xpNeeded}</span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          {/* Marcos desbloqueáveis */}
          {canChooseArchetype(character.level) && !character.archetype && (
            <div className="mt-4 p-3 bg-purple-950/30 border border-purple-800 rounded-lg">
              <p className="text-purple-300 text-sm font-semibold">
                Nível 5 atingido — escolha seu Arquétipo de Ressonância!
              </p>
            </div>
          )}
          {canChooseClass(character.level) && !character.class_id && (
            <div className="mt-2 p-3 bg-blue-950/30 border border-blue-800 rounded-lg">
              <p className="text-blue-300 text-sm font-semibold">
                Nível 10 atingido — escolha sua Classe!
              </p>
            </div>
          )}
        </div>

        {/* Atributos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vitais */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
              Vitais
            </h2>
            <StatBar label="HP" current={attrs.hp_atual} max={attrs.hp_max} color="red" />
            <StatBar label="Éter" current={attrs.eter_atual} max={attrs.eter_max} color="blue" />
            <div className="flex justify-between text-sm pt-2 border-t border-neutral-800">
              <span className="text-neutral-400">Moral</span>
              <span className="font-mono text-amber-400">{attrs.moral}/200</span>
            </div>
          </div>

          {/* Atributos de combate */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-4">
              Atributos
            </h2>
            <div className="space-y-2">
              {[
                ['Ataque', attrs.ataque],
                ['Magia', attrs.magia],
                ['Defesa', attrs.defesa],
                ['Vitalidade', attrs.vitalidade],
                ['Velocidade', attrs.velocidade],
                ['Precisão', attrs.precisao],
                ['Tenacidade', attrs.tenacidade],
                ['Capitania', attrs.capitania],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm">
                  <span className="text-neutral-400">{label}</span>
                  <span className="font-mono font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Distribuição de pontos */}
        {attrs.attribute_points > 0 && (
          <AttributeDistributor
            characterId={character.id}
            availablePoints={attrs.attribute_points}
            currentAttributes={attrs}
          />
        )}

        {/* Carteira */}
        <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-4">
            Carteira
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-neutral-500 mb-1">Libras</p>
              <p className="text-xl font-bold text-yellow-400">{wallet.libras.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500 mb-1">Essência</p>
              <p className="text-xl font-bold text-purple-400">{wallet.essencia.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500 mb-1">Premium</p>
              <p className="text-xl font-bold text-emerald-400">{wallet.premium_currency.toLocaleString()}</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}

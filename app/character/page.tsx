import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { xpToNextLevel, canChooseArchetype, canChooseClass } from '@/lib/game/xp'
import AttributeDistributor from '@/components/character/AttributeDistributor'
import ArkStatBar from '@/components/ui/ArkStatBar'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import {
  SwordIcon, MagicIcon, ShieldIcon, HeartIcon,
  ZapIcon, TargetIcon, AnchorIcon, CrownIcon,
  CoinIcon, CrystalIcon, DiamondIcon,
} from '@/components/ui/ArkIcons'


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
          <p className="text-ark-text-secondary mb-3 font-body">Erro ao carregar personagem.</p>
          <a href="/character" className="text-bronze-light hover:text-bronze-glow underline text-sm font-body">
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
          <p className="text-ark-text-secondary mb-3 font-body">Inicializando personagem...</p>
          <a href="/character" className="text-bronze-light hover:text-bronze-glow underline text-sm font-body">
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

  const xpNeeded = xpToNextLevel(character.level)
  const STATUS_LABELS = { active: 'Vivo', injured: 'Ferido', dead: 'Morto' } as const
  const STATUS_BADGE: Record<string, 'alive' | 'injured' | 'dead'> = {
    active: 'alive', injured: 'injured', dead: 'dead',
  }
  const PROFESSION_LABELS: Record<string, string> = {
    comerciante: 'Comerciante', militar: 'Militar', clerigo: 'Clérigo',
    explorador: 'Explorador', artesao: 'Artesão', erudito: 'Erudito',
    nobre: 'Nobre', mercenario: 'Mercenário',
  }

  const ATTR_ROWS: { key: string; label: string; color: string; Icon: typeof SwordIcon }[] = [
    { key: 'ataque', label: 'Ataque', color: 'text-attr-ataque', Icon: SwordIcon },
    { key: 'magia', label: 'Magia', color: 'text-attr-magia', Icon: MagicIcon },
    { key: 'defesa', label: 'Defesa', color: 'text-attr-defesa', Icon: ShieldIcon },
    { key: 'vitalidade', label: 'Vitalidade', color: 'text-attr-vitalidade', Icon: HeartIcon },
    { key: 'velocidade', label: 'Velocidade', color: 'text-attr-velocidade', Icon: ZapIcon },
    { key: 'precisao', label: 'Precisão', color: 'text-attr-precisao', Icon: TargetIcon },
    { key: 'tenacidade', label: 'Tenacidade', color: 'text-attr-tenacidade', Icon: AnchorIcon },
    { key: 'capitania', label: 'Capitania', color: 'text-attr-capitania', Icon: CrownIcon },
  ]

  return (
    <main className="min-h-screen px-4 py-8 relative">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-wine-dark/8 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-bronze-dark/8 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">

        {/* Header Card */}
        <div className="relative bg-ark-bg-secondary rounded-xl p-6 border border-bronze-dark/25">
          {/* Ornamental top border */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-bronze-mid/40 to-transparent" />

          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-gold-pure text-glow-bronze">
                {character.name}
              </h1>
              {character.title && (
                <p className="text-ark-text-muted text-sm italic font-body mt-0.5">
                  &quot;{character.title}&quot;
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <ArkBadge color="bronze">
                  {PROFESSION_LABELS[character.profession]}
                </ArkBadge>
                {character.archetype ? (
                  <ArkBadge color="capitania">
                    {character.archetype}
                  </ArkBadge>
                ) : (
                  <span className="text-ark-text-muted text-xs font-body">Sem Arquétipo</span>
                )}
              </div>
              {societyName && (
                <p className="text-ark-text-muted text-sm mt-2 font-body">
                  Sociedade: <span className="text-bronze-light">{societyName}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-display font-bold text-gold-pure">
                Nv {character.level}
              </p>
              <ArkBadge color={STATUS_BADGE[character.status]} className="mt-1">
                {STATUS_LABELS[character.status]}
              </ArkBadge>
            </div>
          </div>

          {/* XP Bar */}
          <div className="mt-5">
            <ArkStatBar
              label="Experiência"
              current={character.xp}
              max={xpNeeded}
              type="xp"
            />
          </div>

          {/* Milestone alerts */}
          {canChooseArchetype(character.level) && !character.archetype && (
            <div className="mt-4 p-3 bg-attr-capitania/10 border border-attr-capitania/30 rounded-lg">
              <p className="text-attr-capitania text-sm font-body font-semibold">
                Nível 5 atingido — escolha seu Arquétipo de Ressonância!
              </p>
            </div>
          )}
          {canChooseClass(character.level) && !character.class_id && (
            <div className="mt-2 p-3 bg-attr-eter/10 border border-attr-eter/30 rounded-lg">
              <p className="text-attr-eter text-sm font-body font-semibold">
                Nível 10 atingido — escolha sua Classe!
              </p>
            </div>
          )}
        </div>

        {/* Vitals + Attributes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vitals */}
          <div className="bg-ark-bg-secondary rounded-xl p-5 border border-bronze-dark/25 space-y-4">
            <h2 className="text-xs font-body text-ark-text-secondary uppercase tracking-wider">
              Vitais
            </h2>
            <ArkStatBar label="HP" current={attrs.hp_atual} max={attrs.hp_max} type="hp" />
            <ArkStatBar label="Éter" current={attrs.eter_atual} max={attrs.eter_max} type="eter" />
            <ArkDivider variant="dark" />
            <div className="flex justify-between text-sm">
              <span className="text-ark-text-secondary font-body flex items-center gap-1.5">
                <span className="text-attr-moral">&#x2665;</span> Moral
              </span>
              <span className="font-data font-bold text-attr-moral">{attrs.moral}/200</span>
            </div>
          </div>

          {/* Combat Attributes */}
          <div className="bg-ark-bg-secondary rounded-xl p-5 border border-bronze-dark/25">
            <h2 className="text-xs font-body text-ark-text-secondary uppercase tracking-wider mb-4">
              Atributos
            </h2>
            <div className="space-y-2">
              {ATTR_ROWS.map(({ key, label, color, Icon }) => (
                <div key={key} className="flex items-center justify-between text-sm py-1">
                  <span className="flex items-center gap-2 text-ark-text-secondary font-body">
                    <Icon className={color} size={15} />
                    {label}
                  </span>
                  <span className={`font-data font-bold ${color}`}>
                    {attrs[key as keyof typeof attrs]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Attribute Distribution */}
        {attrs.attribute_points > 0 && (
          <AttributeDistributor
            characterId={character.id}
            availablePoints={attrs.attribute_points}
            currentAttributes={attrs}
          />
        )}

        {/* Wallet */}
        <div className="bg-ark-bg-secondary rounded-xl p-5 border border-bronze-dark/25">
          <h2 className="text-xs font-body text-ark-text-secondary uppercase tracking-wider mb-4">
            Carteira
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-ark-bg-primary border border-bronze-dark/20">
              <CoinIcon className="text-gold-pure mx-auto mb-1" size={22} />
              <p className="text-xs text-ark-text-muted mb-1 font-body">Libras</p>
              <p className="text-xl font-data font-bold text-gold-pure">
                {wallet.libras.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-ark-bg-primary border border-bronze-dark/20">
              <CrystalIcon className="text-attr-capitania mx-auto mb-1" size={22} />
              <p className="text-xs text-ark-text-muted mb-1 font-body">Essência</p>
              <p className="text-xl font-data font-bold text-attr-capitania">
                {wallet.essencia.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-ark-bg-primary border border-bronze-dark/20">
              <DiamondIcon className="text-status-alive mx-auto mb-1" size={22} />
              <p className="text-xs text-ark-text-muted mb-1 font-body">Premium</p>
              <p className="text-xl font-data font-bold text-status-alive">
                {wallet.premium_currency.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}

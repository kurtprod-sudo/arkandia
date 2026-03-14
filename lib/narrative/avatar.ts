// ---------------------------------------------------------------------------
// Sistema de Avatar Visual — Fase 10
// Geração de avatar 2.5D via OpenAI DALL-E 3
// ---------------------------------------------------------------------------

import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createEvent } from '@/lib/game/events'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Prompt canônico base — imutável por design
const CANONICAL_BASE_PROMPT = `Unique 2.5D illustrative art style, precisely replicating the textured finish and hybrid expressive from Fate Series and One Piece. This style is a unique hybrid, blending dynamic comic book line art (defined, variable-width ink outlines with strategic cross-hatching for texture on skin and armor) and rich, painterly digital illustration. This is NOT a generic or clean vector style; all surfaces (skin, fabric, metal, background) must have visible, tactile brush strokes and painterly texture, semi-cel-shaded but with painterly depth. Character faces must be distinct, non-generic, with visible skin texture, maintaining slightly asymmetrical facial features to avoid generic features. Intense, cinematic, producing dramatic, high-contrast shadows. The color palette must be saturated. Deep, painterly background texture with atmospheric haze. High focus, masterpiece, trending on ArtStation.`

// Mapeamento de arma por classe para o prompt
const WEAPON_BY_CLASS: Record<string, string> = {
  Lanceiro:    'wielding a long spear or glaive',
  Espadachim:  'wielding a sword',
  Lutador:     'wearing combat gauntlets, fighting stance',
  Bardo:       'holding a musical instrument as a weapon',
  Atirador:    'wielding an ethereal firearm',
  Arqueiro:    'wielding a bow',
  Assassino:   'wielding dual daggers',
  Druida:      'wielding a greataxe',
  Destruidor:  'wielding a massive warhammer',
  Escudeiro:   'wielding a sword and shield',
  Mago:        'wielding a magical staff',
}

// Mapeamento de raça para descrição visual
const RACE_VISUAL: Record<string, string> = {
  Humano:         'human character, versatile appearance',
  Elfo:           'elven character, slightly pointed ears, graceful features',
  Anão:           'dwarf character, stocky build, robust features',
  Draconiano:     'draconian character, subtle draconic features, scales on skin',
  'Meio-Gigante': 'half-giant character, tall imposing build, large frame',
  Melfork:        'aquatic humanoid character, subtle oceanic features',
}

// Mapeamento de Ressonância para aura visual
const RESONANCE_AURA: Record<string, string> = {
  ordem:     'surrounded by geometric golden seals and structured light patterns',
  caos:      'surrounded by crackling chaotic energy and fragmented reality',
  tempo:     'surrounded by clock-like symbols and temporal distortion',
  espaco:    'surrounded by spatial rifts and starfield energy',
  materia:   'surrounded by earthen and metallic elemental energy',
  vida:      'surrounded by green nature energy and floating petals',
  morte:     'surrounded by dark ethereal wisps and shadows',
  vontade:   'surrounded by intense white burning aura of pure will',
  sonho:     'surrounded by iridescent dream-like crystalline particles',
  guerra:    'surrounded by battle aura, intense combat energy',
  vinculo:   'surrounded by golden bond threads and connection energy',
  ruina:     'surrounded by corrosive dark energy and decaying particles',
}

/**
 * Monta o prompt completo para geração do avatar.
 * Combina base canônica + dados do personagem + características físicas.
 */
export function buildAvatarPrompt(params: {
  raceName: string
  className: string
  resonanceArchetype?: string | null
  physicalTraits?: string | null
}): string {
  const { raceName, className, resonanceArchetype, physicalTraits } = params

  const raceDesc = RACE_VISUAL[raceName] ?? `${raceName} character`
  const weaponDesc = WEAPON_BY_CLASS[className] ?? `${className} warrior`
  const resonanceDesc = resonanceArchetype
    ? (RESONANCE_AURA[resonanceArchetype] ?? '')
    : ''
  const traitsDesc = physicalTraits?.trim()
    ? `Physical appearance: ${physicalTraits.trim()}.`
    : ''

  return [
    CANONICAL_BASE_PROMPT,
    `Character: ${raceDesc}, ${className} class, ${weaponDesc}.`,
    resonanceDesc ? `Resonance aura: ${resonanceDesc}.` : '',
    traitsDesc,
    'Full body portrait, dynamic pose, dark fantasy world background.',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Gera o avatar do personagem via DALL-E 3 e salva no Supabase Storage.
 * Retorna a URL pública da imagem.
 */
export async function generateAvatar(params: {
  characterId: string
  raceName: string
  className: string
  resonanceArchetype?: string | null
  physicalTraits?: string | null
  triggerType: 'creation' | 'rework' | 'maestria_lendaria' | 'item_especial'
  gemasSpent?: number
}): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const prompt = buildAvatarPrompt({
      raceName: params.raceName,
      className: params.className,
      resonanceArchetype: params.resonanceArchetype,
      physicalTraits: params.physicalTraits,
    })

    // Gera imagem via DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    })

    const tempUrl = response.data?.[0]?.url
    if (!tempUrl) return { success: false, error: 'Sem URL retornada pela API.' }

    // Baixa a imagem e faz upload para Supabase Storage
    const imageResponse = await fetch(tempUrl)
    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageBlob.arrayBuffer()

    const supabase = await createClient()
    const fileName = `${params.characterId}/${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      return { success: false, error: `Erro no upload: ${uploadError.message}` }
    }

    // Busca URL pública
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const imageUrl = publicUrlData.publicUrl

    // Atualiza avatar_url no personagem
    await supabase
      .from('characters')
      .update({ avatar_url: imageUrl })
      .eq('id', params.characterId)

    // Registra no histórico
    await supabase.from('avatar_history').insert({
      character_id: params.characterId,
      image_url: imageUrl,
      prompt_used: prompt,
      trigger_type: params.triggerType,
      gemas_spent: params.gemasSpent ?? 0,
    })

    // Registra evento
    await createEvent(supabase, {
      type: 'avatar_generated',
      actorId: params.characterId,
      metadata: {
        trigger_type: params.triggerType,
        gemas_spent: params.gemasSpent ?? 0,
      },
      isPublic: false,
      narrativeText: params.triggerType === 'creation'
        ? 'A imagem do personagem foi forjada.'
        : 'O visual do personagem foi reformulado.',
    })

    return { success: true, imageUrl }
  } catch (err) {
    console.error('[avatar] generateAvatar error:', err)
    return { success: false, error: 'Erro interno na geração do avatar.' }
  }
}

/**
 * Processa rework de avatar — debita Gemas e regenera.
 * Custo: 50 Gemas.
 */
export async function reworkAvatar(
  characterId: string,
  userId: string,
  newPhysicalTraits: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const REWORK_COST = 50
  const supabase = await createClient()

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id, physical_traits, race_id, class_id, resonance_archetype, races(name), classes(name)')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Verifica Gemas
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('premium_currency')
    .eq('character_id', characterId)
    .single()
  if (!wallet || wallet.premium_currency < REWORK_COST) {
    return { success: false, error: `Gemas insuficientes. Custo: ${REWORK_COST} Gemas.` }
  }

  // Debita Gemas
  await supabase
    .from('character_wallet')
    .update({ premium_currency: wallet.premium_currency - REWORK_COST })
    .eq('character_id', characterId)

  // Atualiza physical_traits
  await supabase
    .from('characters')
    .update({ physical_traits: newPhysicalTraits })
    .eq('id', characterId)

  const raceName = (character.races as { name: string } | null)?.name ?? ''
  const className = (character.classes as { name: string } | null)?.name ?? ''

  // Gera novo avatar
  return await generateAvatar({
    characterId,
    raceName,
    className,
    resonanceArchetype: character.resonance_archetype,
    physicalTraits: newPhysicalTraits,
    triggerType: 'rework',
    gemasSpent: REWORK_COST,
  })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEvent } from '@/lib/game/events'
import { calcResonanceEter, calcResonanceCost } from '@/lib/game/attributes'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: character } = await supabase
    .from('characters')
    .select('id, resonance_archetype, resonance_level, is_resonance_unlocked')
    .eq('user_id', user.id)
    .single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })
  if (!character.is_resonance_unlocked) {
    return NextResponse.json({ error: 'Ressonância não desbloqueada.' }, { status: 400 })
  }

  const nextLevel = (character.resonance_level ?? 1) + 1
  const cost = calcResonanceCost(nextLevel)

  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('essencia')
    .eq('character_id', character.id)
    .single()
  if (!wallet || wallet.essencia < cost) {
    return NextResponse.json({ error: `Essências insuficientes. Necessário: ${cost}.` }, { status: 400 })
  }

  const eterBonus = calcResonanceEter(nextLevel)

  // Debit essências
  await supabase
    .from('character_wallet')
    .update({ essencia: wallet.essencia - cost })
    .eq('character_id', character.id)

  // Upgrade resonance level
  await supabase
    .from('characters')
    .update({ resonance_level: nextLevel })
    .eq('id', character.id)

  // Apply Éter bonus
  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('eter_max')
    .eq('character_id', character.id)
    .single()

  if (attrs) {
    await supabase
      .from('character_attributes')
      .update({ eter_max: attrs.eter_max + eterBonus })
      .eq('character_id', character.id)
  }

  await createEvent(supabase, {
    type: 'resonance_upgraded',
    actorId: character.id,
    metadata: { new_level: nextLevel, eter_bonus: eterBonus, cost },
    isPublic: true,
    narrativeText: `Ressonância da ${(character.resonance_archetype as string ?? 'desconhecida').charAt(0).toUpperCase() + (character.resonance_archetype as string ?? 'desconhecida').slice(1)} atingiu nível ${nextLevel}.`,
  })

  return NextResponse.json({ success: true, newLevel: nextLevel, eterBonus })
}

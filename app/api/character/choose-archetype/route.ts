import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/game/notifications'
import { createEvent } from '@/lib/game/events'
import { calcResonanceEter } from '@/lib/game/attributes'

const VALID_ARCHETYPES = [
  'ordem', 'caos', 'tempo', 'espaco', 'materia', 'vida',
  'morte', 'vontade', 'sonho', 'guerra', 'vinculo', 'ruina',
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { archetype } = await req.json()
  if (!archetype || !VALID_ARCHETYPES.includes(archetype)) {
    return NextResponse.json({ error: 'Arquétipo inválido.' }, { status: 400 })
  }

  const { data: character } = await supabase
    .from('characters')
    .select('id, resonance_event_pending')
    .eq('user_id', user.id)
    .single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })

  if (!character.resonance_event_pending) {
    return NextResponse.json({ error: 'Ressonância já escolhida.' }, { status: 400 })
  }

  // Set archetype, unlock resonance, clear pending
  await supabase
    .from('characters')
    .update({
      resonance_archetype: archetype,
      resonance_level: 1,
      is_resonance_unlocked: true,
      resonance_event_pending: false,
    })
    .eq('id', character.id)

  // Apply Éter bonus for resonance level 1: 30×1 + 5×1² = 35
  const eterBonus = calcResonanceEter(1)

  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('eter_max, eter_atual')
    .eq('character_id', character.id)
    .single()

  if (attrs) {
    await supabase
      .from('character_attributes')
      .update({
        eter_max: attrs.eter_max + eterBonus,
        eter_atual: attrs.eter_atual + eterBonus,
      })
      .eq('character_id', character.id)
  }

  await createNotification({
    characterId: character.id,
    type: 'resonance_unlocked',
    title: `Arquétipo da ${archetype.charAt(0).toUpperCase() + archetype.slice(1)} desperta`,
    body: 'Sua Ressonância foi revelada. O Éter em você se expande.',
    actionUrl: '/character',
  })

  await createEvent(supabase, {
    type: 'resonance_unlocked',
    actorId: character.id,
    metadata: { archetype, resonance_level: 1, eter_bonus: eterBonus },
    isPublic: true,
    narrativeText: `A Ressonância da ${archetype.charAt(0).toUpperCase() + archetype.slice(1)} desperta.`,
  })

  return NextResponse.json({ success: true })
}

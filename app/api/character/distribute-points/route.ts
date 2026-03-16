import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcHpMax } from '@/lib/game/attributes'

const DISTRIBUTABLE_ATTRIBUTES = [
  'ataque', 'magia', 'defesa', 'vitalidade', 'velocidade',
  'precisao', 'tenacidade', 'capitania',
] as const

type DistributableAttribute = typeof DISTRIBUTABLE_ATTRIBUTES[number]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { attribute, amount } = await req.json() as {
    attribute: string
    amount: number
  }

  if (!attribute || !amount || amount < 1) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
  }

  if (!DISTRIBUTABLE_ATTRIBUTES.includes(attribute as DistributableAttribute)) {
    return NextResponse.json({ error: 'Atributo inválido.' }, { status: 400 })
  }

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })

  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('attribute_points, vitalidade, eter_max')
    .eq('character_id', character.id)
    .single()
  if (!attrs) return NextResponse.json({ error: 'Atributos não encontrados.' }, { status: 404 })

  if (attrs.attribute_points < amount) {
    return NextResponse.json({ error: 'Pontos insuficientes.' }, { status: 400 })
  }

  // First get current value
  const { data: currentAttrs } = await supabase
    .from('character_attributes')
    .select('*')
    .eq('character_id', character.id)
    .single()
  if (!currentAttrs) return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })

  const currentValue = (currentAttrs as Record<string, unknown>)[attribute] as number
  const newValue = currentValue + amount

  const updateObj: Record<string, number> = {
    attribute_points: attrs.attribute_points - amount,
    [attribute]: newValue,
  }

  // Recalcula HP se vitalidade mudou
  if (attribute === 'vitalidade') {
    const newHpMax = calcHpMax(newValue)
    const hpDiff = newHpMax - currentAttrs.hp_max
    updateObj.hp_max = newHpMax
    updateObj.hp_atual = currentAttrs.hp_atual + hpDiff
  }

  // Recalcula Éter se eter_max mudou (não diretamente distribuível, mas safety)
  if (attribute === 'eter_max') {
    updateObj.eter_atual = currentAttrs.eter_atual + amount
  }

  await supabase
    .from('character_attributes')
    .update(updateObj)
    .eq('character_id', character.id)

  return NextResponse.json({ success: true, attribute, newValue })
}

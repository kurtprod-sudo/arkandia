import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FRAGMENTS_REQUIRED = 10

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { character_id } = await req.json()
  if (!character_id) return NextResponse.json({ error: 'character_id obrigatório.' }, { status: 400 })

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', character_id).eq('user_id', user.id).single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 404 })

  const { data: fragments } = await supabase
    .from('maestria_fragments')
    .select('id, quantity')
    .eq('character_id', character_id)
    .eq('fragment_type', 'prestígio')
    .maybeSingle()

  if (!fragments || fragments.quantity < FRAGMENTS_REQUIRED) {
    return NextResponse.json({
      error: `Fragmentos insuficientes. Necessário: ${FRAGMENTS_REQUIRED}, atual: ${fragments?.quantity ?? 0}.`,
    }, { status: 400 })
  }

  // Debita fragmentos
  await supabase
    .from('maestria_fragments')
    .update({ quantity: fragments.quantity - FRAGMENTS_REQUIRED })
    .eq('id', fragments.id)

  // Busca ou cria Pergaminho de Classe de Prestígio no inventário
  const { data: pergaminho } = await supabase
    .from('items')
    .select('id')
    .eq('name', 'Pergaminho de Classe de Prestígio')
    .maybeSingle()

  if (pergaminho) {
    const { data: inv } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('character_id', character_id)
      .eq('item_id', pergaminho.id)
      .maybeSingle()

    if (inv) {
      await supabase.from('inventory').update({ quantity: inv.quantity + 1 }).eq('id', inv.id)
    } else {
      await supabase.from('inventory').insert({ character_id: character_id, item_id: pergaminho.id, quantity: 1 })
    }
  }

  return NextResponse.json({
    success: true,
    newFragmentCount: fragments.quantity - FRAGMENTS_REQUIRED,
  })
}

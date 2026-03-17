import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const characterId = req.nextUrl.searchParams.get('character_id')
  if (!characterId) return NextResponse.json({ error: 'character_id obrigatório.' }, { status: 400 })

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', user.id).single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado.' }, { status: 403 })

  const { data: inventory } = await supabase
    .from('inventory')
    .select('id, item_id, quantity, items(name, item_type)')
    .eq('character_id', characterId)
    .gt('quantity', 0)

  const consumables = (inventory ?? [])
    .filter((i) => (i.items as Record<string, unknown> | null)?.item_type === 'consumivel')
    .map((i) => ({
      id: i.id,
      itemId: i.item_id,
      name: (i.items as Record<string, unknown>)?.name as string ?? '?',
      quantity: i.quantity,
    }))

  return NextResponse.json({ items: consumables })
}

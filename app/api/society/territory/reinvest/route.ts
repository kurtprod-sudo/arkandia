import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const REINVESTMENT_COST_PER_LEVEL = [0, 500, 1200, 2500, 4500, 7500, 12000, 20000]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { society_id, territory_id } = await req.json()
  if (!society_id || !territory_id) {
    return NextResponse.json({ error: 'society_id e territory_id obrigatórios.' }, { status: 400 })
  }

  // Verifica que o usuário é membro da sociedade
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .eq('society_id', society_id)
    .single()
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado na sociedade.' }, { status: 403 })

  const { data: membership } = await supabase
    .from('society_members')
    .select('role')
    .eq('society_id', society_id)
    .eq('character_id', character.id)
    .single()
  if (!['leader', 'officer'].includes(membership?.role ?? '')) {
    return NextResponse.json({ error: 'Apenas Líder ou General pode reinvestir.' }, { status: 403 })
  }

  // Busca produção atual do território
  const { data: prod } = await supabase
    .from('territory_production')
    .select('id, reinvestment_level')
    .eq('territory_id', territory_id)
    .eq('society_id', society_id)
    .single()
  if (!prod) return NextResponse.json({ error: 'Território não controlado por esta sociedade.' }, { status: 404 })

  const currentLevel = prod.reinvestment_level ?? 0
  const maxLevel = REINVESTMENT_COST_PER_LEVEL.length - 1

  if (currentLevel >= maxLevel) {
    return NextResponse.json({ error: 'Nível máximo de reinvestimento atingido.' }, { status: 400 })
  }

  const newLevel = currentLevel + 1
  const cost = REINVESTMENT_COST_PER_LEVEL[newLevel]

  // Verifica cofre da sociedade
  const { data: society } = await supabase
    .from('societies')
    .select('treasury_libras')
    .eq('id', society_id)
    .single()
  if (!society) return NextResponse.json({ error: 'Sociedade não encontrada.' }, { status: 404 })

  if ((society.treasury_libras ?? 0) < cost) {
    return NextResponse.json({
      error: `Cofre insuficiente. Necessário: ${cost} Libras. Disponível: ${society.treasury_libras ?? 0}.`,
    }, { status: 400 })
  }

  // Debita do cofre e sobe o nível
  await supabase
    .from('societies')
    .update({ treasury_libras: (society.treasury_libras ?? 0) - cost })
    .eq('id', society_id)

  await supabase
    .from('territory_production')
    .update({ reinvestment_level: newLevel })
    .eq('id', prod.id)

  return NextResponse.json({
    success: true,
    newLevel,
    costPaid: cost,
    nextLevelCost: newLevel < maxLevel ? REINVESTMENT_COST_PER_LEVEL[newLevel + 1] : null,
  })
}

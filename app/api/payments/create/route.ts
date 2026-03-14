import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPixPayment } from '@/lib/payments/mercadopago'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const body = await req.json()
  const { characterId, gemasAmount } = body as {
    characterId: string
    gemasAmount: number
  }

  if (!characterId || !gemasAmount) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  const result = await createPixPayment(characterId, user.id, Number(gemasAmount))
  return NextResponse.json(result)
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelPayment } from '@/lib/payments/mercadopago'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const body = await req.json()
  const { paymentId } = body as { paymentId: string }

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId obrigatório.' }, { status: 400 })
  }

  const result = await cancelPayment(paymentId, user.id)
  return NextResponse.json(result)
}

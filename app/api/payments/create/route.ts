import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPixPayment, type GemaPackageId } from '@/lib/payments/mercadopago'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const body = await req.json()
  const { characterId, packageId, payerEmail } = body as {
    characterId: string
    packageId: GemaPackageId
    payerEmail: string
  }

  if (!characterId || !packageId || !payerEmail) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  const result = await createPixPayment(characterId, user.id, packageId, payerEmail)
  return NextResponse.json(result)
}

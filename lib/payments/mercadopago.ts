import { MercadoPagoConfig, Payment as MPPayment } from 'mercadopago'
import { createClient } from '@/lib/supabase/server'
import { createEvent } from '@/lib/game/events'

const GEMAS_MIN = 50
const GEMAS_MAX = 50000
const GEMAS_PER_BRL = 10 // R$ 1,00 = 10 Gemas

function getMP() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.')
  const config = new MercadoPagoConfig({ accessToken })
  return new MPPayment(config)
}

function validateGemasAmount(amount: number): string | null {
  if (!Number.isInteger(amount)) return 'Quantidade deve ser um número inteiro.'
  if (amount < GEMAS_MIN) return `Mínimo de ${GEMAS_MIN} Gemas.`
  if (amount > GEMAS_MAX) return `Máximo de ${GEMAS_MAX} Gemas.`
  if (amount % 10 !== 0) return 'Quantidade deve ser múltiplo de 10.'
  return null
}

/**
 * Cria um pagamento PIX no Mercado Pago e salva no banco.
 * Proporção: R$ 1,00 = 10 Gemas.
 */
export async function createPixPayment(
  characterId: string,
  userId: string,
  gemasAmount: number
): Promise<{
  success: boolean
  error?: string
  paymentId?: string
  qrCode?: string
  qrCodeBase64?: string
  ticketUrl?: string
  expiresAt?: string
}> {
  const validationError = validateGemasAmount(gemasAmount)
  if (validationError) return { success: false, error: validationError }

  const priceBrl = gemasAmount / GEMAS_PER_BRL

  const supabase = await createClient()

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Verifica se já tem pagamento pendente
  const { data: pending } = await supabase
    .from('payments')
    .select('id')
    .eq('character_id', characterId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (pending) return { success: false, error: 'Você já tem um pagamento pendente.' }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 min

  try {
    const mp = getMP()
    const response = await mp.create({
      body: {
        transaction_amount: priceBrl,
        description: `${gemasAmount} Gemas — Arkandia`,
        payment_method_id: 'pix',
        payer: { email: `${characterId}@arkandia.game` },
        date_of_expiration: expiresAt.toISOString(),
        external_reference: `arkandia_${characterId}_${Date.now()}`,
      },
    })

    const txData = response.point_of_interaction?.transaction_data
    const qrCode = txData?.qr_code ?? null
    const qrCodeBase64 = txData?.qr_code_base64 ?? null
    const ticketUrl = txData?.ticket_url ?? null

    // Salva no banco
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        character_id: characterId,
        mp_payment_id: String(response.id ?? ''),
        status: 'pending',
        amount_brl: priceBrl,
        gemas_amount: gemasAmount,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        ticket_url: ticketUrl,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error || !payment) return { success: false, error: 'Erro ao salvar pagamento.' }

    await createEvent(supabase, {
      type: 'payment_created',
      actorId: characterId,
      metadata: {
        payment_id: payment.id,
        amount_brl: priceBrl,
        gemas: gemasAmount,
      },
      isPublic: false,
    })

    return {
      success: true,
      paymentId: payment.id,
      qrCode: qrCode ?? undefined,
      qrCodeBase64: qrCodeBase64 ?? undefined,
      ticketUrl: ticketUrl ?? undefined,
      expiresAt: expiresAt.toISOString(),
    }
  } catch (err) {
    console.error('[createPixPayment] MP error:', err)
    return { success: false, error: 'Erro ao criar pagamento no Mercado Pago.' }
  }
}

/**
 * Consulta o status de um pagamento e credita gemas se aprovado.
 */
export async function checkPaymentStatus(
  paymentId: string,
  userId: string
): Promise<{
  success: boolean
  error?: string
  status?: string
  gemasCredited?: boolean
}> {
  const supabase = await createClient()

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()
  if (!payment) return { success: false, error: 'Pagamento não encontrado.' }

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', payment.character_id)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  // Se já está aprovado, retorna direto
  if (payment.status === 'approved') {
    return { success: true, status: 'approved', gemasCredited: true }
  }

  // Se já expirou localmente
  if (payment.status === 'pending' && new Date(payment.expires_at) < new Date()) {
    await supabase
      .from('payments')
      .update({ status: 'expired' })
      .eq('id', paymentId)
    return { success: true, status: 'expired' }
  }

  // Se cancelado/rejected/expired, retorna
  if (['cancelled', 'rejected', 'expired'].includes(payment.status)) {
    return { success: true, status: payment.status }
  }

  // Consulta no Mercado Pago
  if (!payment.mp_payment_id) {
    return { success: true, status: payment.status }
  }

  try {
    const mp = getMP()
    const mpPayment = await mp.get({ id: payment.mp_payment_id })
    const mpStatus = mpPayment.status ?? 'pending'

    let newStatus = payment.status as string
    let gemasCredited = false

    if (mpStatus === 'approved' && payment.status !== 'approved') {
      newStatus = 'approved'

      // Credita gemas
      const { data: wallet } = await supabase
        .from('character_wallet')
        .select('premium_currency')
        .eq('character_id', payment.character_id)
        .single()

      if (wallet) {
        await supabase
          .from('character_wallet')
          .update({
            premium_currency: (wallet.premium_currency ?? 0) + payment.gemas_amount,
          })
          .eq('character_id', payment.character_id)

        gemasCredited = true

        await createEvent(supabase, {
          type: 'payment_approved',
          actorId: payment.character_id,
          metadata: {
            payment_id: payment.id,
            gemas_amount: payment.gemas_amount,
            amount_brl: payment.amount_brl,
          },
          isPublic: false,
        })
      }

      await supabase
        .from('payments')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', paymentId)
    } else if (mpStatus === 'rejected') {
      newStatus = 'rejected'
      await supabase
        .from('payments')
        .update({ status: 'rejected' })
        .eq('id', paymentId)
    } else if (mpStatus === 'cancelled') {
      newStatus = 'cancelled'
      await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId)
    }

    return { success: true, status: newStatus, gemasCredited }
  } catch (err) {
    console.error('[checkPaymentStatus] MP error:', err)
    return { success: true, status: payment.status }
  }
}

/**
 * Cancela um pagamento pendente.
 */
export async function cancelPayment(
  paymentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()
  if (!payment) return { success: false, error: 'Pagamento não encontrado.' }

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', payment.character_id)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  if (payment.status !== 'pending') {
    return { success: false, error: 'Pagamento não pode ser cancelado.' }
  }

  // Tenta cancelar no MP
  if (payment.mp_payment_id) {
    try {
      const mp = getMP()
      await mp.cancel({ id: payment.mp_payment_id })
    } catch {
      // Ignora erro de cancelamento no MP — pode já ter expirado
    }
  }

  await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('id', paymentId)

  return { success: true }
}

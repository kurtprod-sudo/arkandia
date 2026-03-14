'use client'

import { useState, useEffect, useCallback } from 'react'
import ArkButton from '@/components/ui/ArkButton'

interface GemaPackage {
  id: string
  gemas: number
  price_brl: number
  label: string
}

interface PendingPaymentData {
  id: string
  qrCode?: string
  qrCodeBase64?: string
  ticketUrl?: string
  expiresAt: string
  gemasAmount: number
  amountBrl: number
}

type ShopState = 'selection' | 'qrcode' | 'success' | 'error'

interface Props {
  characterId: string
  packages: GemaPackage[]
  pendingPayment?: PendingPaymentData
}

export default function ShopPanel({ characterId, packages, pendingPayment }: Props) {
  const [state, setState] = useState<ShopState>(pendingPayment ? 'qrcode' : 'selection')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [paymentData, setPaymentData] = useState<PendingPaymentData | undefined>(pendingPayment)
  const [email, setEmail] = useState('')
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')
  const [creditedGemas, setCreditedGemas] = useState(0)

  // Countdown timer
  useEffect(() => {
    if (state !== 'qrcode' || !paymentData?.expiresAt) return

    const tick = () => {
      const now = Date.now()
      const expires = new Date(paymentData.expiresAt).getTime()
      const diff = expires - now

      if (diff <= 0) {
        setCountdown('Expirado')
        setState('error')
        setErrorMsg('O tempo do pagamento expirou. Tente novamente.')
        return
      }

      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [state, paymentData?.expiresAt])

  // Poll payment status
  const pollStatus = useCallback(async () => {
    if (!paymentData?.id) return

    try {
      const res = await fetch('/api/payments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: paymentData.id }),
      })
      const data = await res.json()

      if (data.status === 'approved') {
        setCreditedGemas(paymentData.gemasAmount)
        setState('success')
      } else if (data.status === 'rejected') {
        setState('error')
        setErrorMsg('Pagamento rejeitado pelo Mercado Pago.')
      } else if (data.status === 'cancelled' || data.status === 'expired') {
        setState('error')
        setErrorMsg('Pagamento cancelado ou expirado.')
      }
    } catch {
      // Silently retry on network error
    }
  }, [paymentData?.id, paymentData?.gemasAmount])

  useEffect(() => {
    if (state !== 'qrcode') return
    const interval = setInterval(pollStatus, 5000)
    return () => clearInterval(interval)
  }, [state, pollStatus])

  async function handleCreatePayment() {
    if (!selectedPack || !email) return

    setLoading(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          packageId: selectedPack,
          payerEmail: email,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        setErrorMsg(data.error ?? 'Erro ao criar pagamento.')
        return
      }

      const pack = packages.find((p) => p.id === selectedPack)
      setPaymentData({
        id: data.paymentId,
        qrCode: data.qrCode,
        qrCodeBase64: data.qrCodeBase64,
        ticketUrl: data.ticketUrl,
        expiresAt: data.expiresAt,
        gemasAmount: pack?.gemas ?? 0,
        amountBrl: pack?.price_brl ?? 0,
      })
      setState('qrcode')
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!paymentData?.id) return
    setLoading(true)
    try {
      await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: paymentData.id }),
      })
    } catch {
      // ignore
    }
    setPaymentData(undefined)
    setSelectedPack(null)
    setState('selection')
    setLoading(false)
  }

  function handleReset() {
    setPaymentData(undefined)
    setSelectedPack(null)
    setEmail('')
    setErrorMsg('')
    setCreditedGemas(0)
    setState('selection')
  }

  // ── Selection State ──
  if (state === 'selection') {
    return (
      <div className="space-y-4">
        {/* Package Grid */}
        <div className="grid grid-cols-2 gap-3">
          {packages.map((pack) => (
            <button
              key={pack.id}
              onClick={() => setSelectedPack(pack.id)}
              className={`p-4 rounded-sm border text-left transition-colors ${
                selectedPack === pack.id
                  ? 'border-[var(--ark-border-bright)] bg-[var(--ark-surface-hover)]'
                  : 'border-[var(--ark-border)] bg-[var(--ark-surface)] hover:border-[var(--ark-border-bright)]'
              }`}
            >
              <p className="font-display text-lg font-bold text-[var(--ark-gold-bright)]">
                {pack.gemas}
              </p>
              <p className="font-body text-xs text-[var(--text-secondary)]">Gemas</p>
              <p className="font-data text-sm text-[var(--text-primary)] mt-2">
                R$ {pack.price_brl.toFixed(2).replace('.', ',')}
              </p>
            </button>
          ))}
        </div>

        {/* Email + Confirm */}
        {selectedPack && (
          <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-3">
            <label className="block">
              <span className="font-body text-sm text-[var(--text-secondary)]">
                E-mail do pagador (para o PIX)
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="mt-1 w-full px-3 py-2 bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-sm font-data text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:border-[var(--ark-border-bright)] focus:outline-none"
              />
            </label>

            {errorMsg && (
              <p className="text-sm text-[var(--ark-red-glow)] font-body">{errorMsg}</p>
            )}

            <ArkButton
              onClick={handleCreatePayment}
              disabled={loading || !email}
              size="lg"
              className="w-full"
            >
              {loading ? 'Gerando PIX...' : 'Pagar com PIX'}
            </ArkButton>
          </div>
        )}
      </div>
    )
  }

  // ── QR Code State ──
  if (state === 'qrcode' && paymentData) {
    return (
      <div className="space-y-4">
        <div className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-6 text-center space-y-4">
          <p className="font-body text-sm text-[var(--text-secondary)]">
            Escaneie o QR Code ou copie o código PIX
          </p>

          {/* QR Code Image */}
          {paymentData.qrCodeBase64 && (
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${paymentData.qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-48 h-48 rounded bg-white p-2"
              />
            </div>
          )}

          {/* Copy PIX code */}
          {paymentData.qrCode && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(paymentData.qrCode ?? '')
              }}
              className="w-full px-3 py-2 bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-xs font-data text-[var(--text-secondary)] hover:border-[var(--ark-border-bright)] transition-colors truncate"
              title="Clique para copiar"
            >
              {paymentData.qrCode.slice(0, 60)}...
            </button>
          )}

          {/* Payment info */}
          <div className="flex justify-between text-sm font-data">
            <span className="text-[var(--text-label)]">Valor</span>
            <span className="text-[var(--text-primary)]">
              R$ {paymentData.amountBrl.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="flex justify-between text-sm font-data">
            <span className="text-[var(--text-label)]">Gemas</span>
            <span className="text-[var(--ark-gold-bright)]">{paymentData.gemasAmount}</span>
          </div>

          {/* Countdown */}
          <div className="flex justify-between text-sm font-data">
            <span className="text-[var(--text-label)]">Expira em</span>
            <span className={`font-bold ${countdown === 'Expirado' ? 'text-[var(--ark-red-glow)]' : 'text-[var(--text-primary)]'}`}>
              {countdown}
            </span>
          </div>

          {/* Ticket URL fallback */}
          {paymentData.ticketUrl && (
            <a
              href={paymentData.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline font-body"
            >
              Abrir página de pagamento
            </a>
          )}
        </div>

        <ArkButton
          variant="ghost"
          onClick={handleCancel}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Cancelando...' : 'Cancelar pagamento'}
        </ArkButton>

        <p className="text-xs text-[var(--text-ghost)] text-center font-body">
          Verificando pagamento automaticamente...
        </p>
      </div>
    )
  }

  // ── Success State ──
  if (state === 'success') {
    return (
      <div className="space-y-4">
        <div className="bg-[var(--ark-surface)] border-2 border-[var(--ark-gold-bright)] rounded-sm p-6 text-center space-y-3 animate-pulse-slow">
          <div className="text-4xl">&#9670;</div>
          <h2 className="font-display text-xl font-bold text-[var(--ark-gold-bright)]">
            Pagamento Aprovado!
          </h2>
          <p className="font-body text-[var(--text-secondary)]">
            <span className="font-data font-bold text-[var(--ark-gold-bright)]">{creditedGemas}</span>{' '}
            Gemas foram creditadas na sua conta.
          </p>
        </div>

        <ArkButton onClick={handleReset} variant="ghost" className="w-full">
          Voltar à loja
        </ArkButton>
      </div>
    )
  }

  // ── Error/Expired State ──
  return (
    <div className="space-y-4">
      <div className="bg-[var(--ark-surface)] border border-[var(--ark-red)]/60 rounded-sm p-6 text-center space-y-3">
        <div className="text-3xl text-[var(--ark-red-glow)]">&#10005;</div>
        <h2 className="font-display text-lg font-bold text-[var(--ark-red-glow)]">
          Pagamento não concluído
        </h2>
        <p className="font-body text-sm text-[var(--text-secondary)]">
          {errorMsg || 'Ocorreu um erro com o pagamento.'}
        </p>
      </div>

      <ArkButton onClick={handleReset} className="w-full">
        Tentar novamente
      </ArkButton>
    </div>
  )
}

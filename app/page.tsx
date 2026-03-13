'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Image from 'next/image'
import { login, register } from '@/app/auth/actions'

// ── TIPOS ──────────────────────────────────────────────────────────────────

type AuthMode = 'login' | 'register'
type AuthState = { error: string } | null

// ── ESTILOS REUTILIZÁVEIS ──────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-intelo)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(7,5,15,0.6)',
  border: '1px solid rgba(196,42,30,0.3)',
  borderRadius: 2,
  padding: '11px 14px',
  color: '#ffffff',
  fontFamily: 'var(--font-intelo)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
}

// ── COMPONENTES AUXILIARES ─────────────────────────────────────────────────

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: '100%',
        padding: '13px',
        marginTop: '8px',
        background: pending ? 'rgba(110,22,15,0.4)' : '#6e160f',
        color: '#ffffff',
        fontFamily: 'var(--font-intelo), sans-serif',
        fontWeight: 600,
        fontSize: '11px',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        border: '1px solid rgba(196,42,30,0.5)',
        borderRadius: '2px',
        cursor: pending ? 'not-allowed' : 'pointer',
        opacity: pending ? 0.4 : 1,
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => { if (!pending) e.currentTarget.style.background = '#a01f16' }}
      onMouseLeave={e => { if (!pending) e.currentTarget.style.background = '#6e160f' }}
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function FormField({ label, name, type, ...props }: {
  label: string
  name: string
  type: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <input
        name={name}
        type={type}
        style={inputStyle}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(196,42,30,0.8)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(196,42,30,0.3)' }}
        {...props}
      />
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────

export default function HomePage() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  const [loginState, loginAction] = useFormState<AuthState, FormData>(
    async (_prev: AuthState, formData: FormData) => {
      const result = await login(formData)
      return result ?? null
    },
    null
  )

  const [registerState, registerAction] = useFormState<AuthState, FormData>(
    async (_prev: AuthState, formData: FormData) => {
      const result = await register(formData)
      return result ?? null
    },
    null
  )

  return (
    <div style={{ height: '100vh', position: 'relative', background: '#050203' }}>

      {/* ── BACKGROUND ── */}
      <Image
        src="/assets/landingpage/hero-bg.webp"
        alt=""
        fill
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        priority
      />

      {/* ── OVERLAY ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'rgba(7,5,15,0.6)',
      }} />

      {/* ── CONTEÚDO ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        paddingTop: '5vh',
      }}>

        {/* Logo */}
        <Image
          src="/assets/arkandialogo.webp"
          alt="Arkandia"
          width={300}
          height={300}
          style={{ mixBlendMode: 'screen' as React.CSSProperties['mixBlendMode'] }}
          priority
        />

        {/* Espaço entre logo e card */}
        <div style={{ height: '32px' }} />

        {/* ── AUTH CARD ── */}
        <div style={{
          background: 'rgba(110,22,15,0.15)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(196,42,30,0.3)',
          borderRadius: '2px',
          padding: '32px 36px',
          width: '340px',
        }}>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(196,42,30,0.2)',
            marginBottom: '24px',
          }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => setAuthMode(m)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontFamily: 'var(--font-intelo), sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: authMode === m ? '#ffffff' : 'rgba(255,255,255,0.35)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: authMode === m ? '2px solid #c42a1e' : '2px solid transparent',
                  marginBottom: '-1px',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => { if (authMode !== m) e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
                onMouseLeave={e => { if (authMode !== m) e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
              >
                {m === 'login' ? 'Entrar' : 'Registrar'}
              </button>
            ))}
          </div>

          {/* Login form */}
          {authMode === 'login' && (
            <form action={loginAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FormField label="Email" name="email" type="email" autoComplete="email" required />
              <FormField label="Senha" name="password" type="password" autoComplete="current-password" required />
              <SubmitButton label="Entrar" pendingLabel="Entrando..." />
              {loginState?.error && (
                <p style={{
                  color: '#ff6b6b', fontSize: '12px',
                  fontFamily: 'var(--font-intelo), sans-serif',
                  marginTop: '4px', textAlign: 'center',
                }}>
                  {loginState.error}
                </p>
              )}
            </form>
          )}

          {/* Register form */}
          {authMode === 'register' && (
            <form action={registerAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FormField
                label="Usuário" name="username" type="text"
                autoComplete="username" required minLength={3} maxLength={24}
                pattern="[a-zA-Z0-9_]+" title="Apenas letras, números e underscore"
              />
              <FormField label="Email" name="email" type="email" autoComplete="email" required />
              <FormField label="Senha" name="password" type="password" autoComplete="new-password" required minLength={8} />
              <SubmitButton label="Registrar" pendingLabel="Registrando..." />
              {registerState?.error && (
                <p style={{
                  color: '#ff6b6b', fontSize: '12px',
                  fontFamily: 'var(--font-intelo), sans-serif',
                  marginTop: '4px', textAlign: 'center',
                }}>
                  {registerState.error}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Link alternativo */}
        <p style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: '11px',
          fontFamily: 'var(--font-intelo), sans-serif',
          marginTop: '12px',
          textAlign: 'center',
        }}>
          {authMode === 'login' ? (
            <>
              Não tem conta?{' '}
              <button
                onClick={() => setAuthMode('register')}
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-intelo), sans-serif',
                  fontSize: '11px', transition: 'color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ffffff' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >
                Registrar
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button
                onClick={() => setAuthMode('login')}
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-intelo), sans-serif',
                  fontSize: '11px', transition: 'color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ffffff' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >
                Entrar
              </button>
            </>
          )}
        </p>

      </div>
    </div>
  )
}

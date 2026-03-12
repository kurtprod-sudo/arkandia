'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { type ReactNode } from 'react'

interface AuthFormProps {
  action: (formData: FormData) => Promise<{ error: string } | undefined>
  submitLabel: string
  children: ReactNode
}

interface ActionState {
  error?: string
}

export default function AuthForm({ action, submitLabel, children }: AuthFormProps) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    async (_prev: ActionState, formData: FormData) => {
      const result = await action(formData)
      return result ?? {}
    },
    {}
  )

  return (
    <form action={formAction} className="space-y-5">
      {children}

      {state?.error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-950/40 border border-red-900/50 text-red-300 text-sm font-body">
          <span className="shrink-0">&#x26A0;</span>
          {state.error}
        </div>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="
        w-full py-3 px-4 rounded-lg
        font-body font-bold text-base
        bg-gradient-to-r from-wine-dark to-wine-mid
        text-bronze-glow border border-bronze-mid/30
        hover:from-wine-mid hover:to-wine-light hover:shadow-glow-wine
        disabled:from-wine-dark/50 disabled:to-wine-dark/50
        disabled:text-ark-text-muted disabled:border-bronze-dark/10
        disabled:cursor-not-allowed
        transition-all duration-200
      "
    >
      {pending ? 'Aguarde...' : label}
    </button>
  )
}

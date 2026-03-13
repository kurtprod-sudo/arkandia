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
        w-full py-3 px-4 rounded-sm
        font-data font-semibold tracking-widest uppercase text-xs
        bg-[var(--text-ghost)] text-[var(--ark-gold-bright)] border border-[var(--ark-gold)]
        hover:border-[#f0c84a]/50
        disabled:bg-[#3A2A18]/30 disabled:text-[var(--text-ghost)] disabled:border-[var(--ark-gold-dim)]
        disabled:cursor-not-allowed
        transition-all duration-200
      "
    >
      {pending ? 'Aguarde...' : label}
    </button>
  )
}

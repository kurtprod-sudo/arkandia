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
    <form action={formAction} className="space-y-4">
      {children}

      {state?.error && (
        <p className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded px-3 py-2">
          {state.error}
        </p>
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
      className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-800 disabled:cursor-not-allowed text-black font-semibold rounded transition-colors"
    >
      {pending ? 'Aguarde...' : label}
    </button>
  )
}

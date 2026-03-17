'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'

interface Props {
  username: string
}

export default function CopyProfileLink({ username }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const url = `${window.location.origin}/u/${username}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar link do perfil público"
      className="flex items-center gap-1 text-[10px] font-data text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors"
    >
      <Link2 size={12} />
      {copied ? 'Copiado!' : 'Copiar link'}
    </button>
  )
}

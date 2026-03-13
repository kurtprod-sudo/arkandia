'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadPortrait } from '@/app/character/uploadPortrait'

interface PortraitUploadProps {
  characterInitial?: string
  currentUrl: string | null
}

export default function PortraitUpload({ characterInitial, currentUrl }: PortraitUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Immediate preview via FileReader
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setError(null)

    const formData = new FormData()
    formData.append('portrait', file)

    startTransition(async () => {
      const result = await uploadPortrait(formData)
      if (result.error) {
        setError(result.error)
        setPreview(currentUrl) // revert preview on failure
      } else if (result.url) {
        setPreview(result.url)
      }
    })
  }

  return (
    <div className="group relative w-full h-full cursor-pointer"
      onClick={() => !isPending && inputRef.current?.click()}
    >
      {/* Portrait image / placeholder */}
      <div className="relative h-full rounded overflow-hidden bg-gradient-to-b from-[#1a0a0a] to-[#0a0508]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Portrait"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-7xl font-display font-bold text-transparent select-none"
              style={{ WebkitTextStroke: '1.5px rgba(211,165,57,0.15)' }}
            >
              {characterInitial}
            </span>
          </div>
        )}

        {/* Hover overlay — upload hint */}
        <div className={`
          absolute inset-0 flex flex-col items-center justify-center gap-2
          bg-black/60 transition-opacity duration-200
          ${isPending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}>
          {isPending ? (
            <div className="w-5 h-5 border-2 border-[#d3a539]/40 border-t-[var(--text-gold)] rounded-full animate-spin" />
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" className="text-[var(--text-gold)]">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="font-data text-[11px] tracking-[0.2em] text-[var(--text-gold)] uppercase">
                {preview ? 'Alterar' : '+ Portrait'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-center font-data text-[11px] text-[var(--ark-red-glow)] tracking-wide">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={isPending}
      />
    </div>
  )
}

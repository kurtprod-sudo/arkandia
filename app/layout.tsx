import type { Metadata } from 'next'
import { Cormorant_Garamond, Rajdhani, Libre_Baskerville } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-data',
  display: 'swap',
})

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Arkandia',
  description: 'RPG Híbrido — o mundo te aguarda.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${rajdhani.variable} ${libreBaskerville.variable}`}>
      <body className="antialiased bg-[var(--ark-void)] text-[var(--text-primary)] font-body min-h-screen">
        {children}
      </body>
    </html>
  )
}

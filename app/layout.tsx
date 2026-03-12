import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="pt-BR">
      <body className="antialiased bg-neutral-950 text-white">
        {children}
      </body>
    </html>
  )
}

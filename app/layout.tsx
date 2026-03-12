import type { Metadata } from 'next'
import { Cinzel_Decorative, Crimson_Pro, Inter } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
})

const crimson = Crimson_Pro({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-crimson',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
    <html lang="pt-BR" className={`${cinzel.variable} ${crimson.variable} ${inter.variable}`}>
      <body className="antialiased bg-ark-bg-primary text-ark-text-primary font-body">
        {children}
      </body>
    </html>
  )
}

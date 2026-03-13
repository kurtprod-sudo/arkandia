import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const intelo = localFont({
  src: [
    { path: '../public/fonts/Intelo-Thin.ttf',             weight: '100', style: 'normal'  },
    { path: '../public/fonts/Intelo-ThinItalic.ttf',       weight: '100', style: 'italic'  },
    { path: '../public/fonts/Intelo-Hairline.ttf',         weight: '200', style: 'normal'  },
    { path: '../public/fonts/Intelo-HairlineItalic.ttf',   weight: '200', style: 'italic'  },
    { path: '../public/fonts/Intelo-Light.ttf',            weight: '300', style: 'normal'  },
    { path: '../public/fonts/Intelo-LightItalic.ttf',      weight: '300', style: 'italic'  },
    { path: '../public/fonts/Intelo-Regular.ttf',          weight: '400', style: 'normal'  },
    { path: '../public/fonts/Intelo-Italic.ttf',           weight: '400', style: 'italic'  },
    { path: '../public/fonts/Intelo-Medium.ttf',           weight: '500', style: 'normal'  },
    { path: '../public/fonts/Intelo-MediumItalic.ttf',     weight: '500', style: 'italic'  },
    { path: '../public/fonts/Intelo-SemiBold.ttf',         weight: '600', style: 'normal'  },
    { path: '../public/fonts/Intelo-SemiBoldItalic.ttf',   weight: '600', style: 'italic'  },
    { path: '../public/fonts/Intelo-Bold.ttf',             weight: '700', style: 'normal'  },
    { path: '../public/fonts/Intelo-BoldItalic.ttf',       weight: '700', style: 'italic'  },
    { path: '../public/fonts/Intelo-ExtraBold.ttf',        weight: '800', style: 'normal'  },
    { path: '../public/fonts/Intelo-ExtraBoldItalic.ttf',  weight: '800', style: 'italic'  },
  ],
  variable: '--font-intelo',
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
    <html lang="pt-BR" className={intelo.variable}>
      <body className="antialiased bg-[var(--ark-void)] text-[var(--text-primary)] font-body min-h-screen">
        {children}
      </body>
    </html>
  )
}

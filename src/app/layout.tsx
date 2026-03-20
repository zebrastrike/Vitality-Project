import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'The Vitality Project — Premium Peptides',
    template: '%s | The Vitality Project',
  },
  description:
    'Premium quality peptides and performance compounds. Private label, direct to you.',
  keywords: ['peptides', 'BPC-157', 'TB-500', 'performance', 'vitality', 'health'],
  openGraph: {
    type: 'website',
    siteName: 'The Vitality Project',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-dark-900 text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

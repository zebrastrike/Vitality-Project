import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { VitalityVeins } from '@/components/vitality-veins'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vitalityproject.global'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
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
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Vitality Project — Premium Peptides',
    description:
      'Premium quality peptides and performance compounds. Private label, direct to you.',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vitality',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'The Vitality Project',
    url: APP_URL,
    logo: `${APP_URL}/logo-white.png`,
    description:
      'Premium quality peptides and performance compounds for qualified research use.',
    sameAs: [] as string[],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@vitalityproject.global',
      availableLanguage: ['English'],
    },
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Providers>
          <VitalityVeins />
          {children}
        </Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}

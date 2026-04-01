export const dynamic = 'force-dynamic'

import { Navbar } from '@/components/store/navbar'
import { Footer } from '@/components/store/footer'
import { AiChat } from '@/components/store/ai-chat'
import { RuoBanner } from '@/components/store/ruo-banner'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen relative z-2">
      <RuoBanner />
      <Navbar />
      <main className="flex-1 pt-24">{children}</main>
      <Footer />
      <AiChat />
    </div>
  )
}

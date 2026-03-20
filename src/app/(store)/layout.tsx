export const dynamic = 'force-dynamic'

import { Navbar } from '@/components/store/navbar'
import { Footer } from '@/components/store/footer'
import { AiChat } from '@/components/store/ai-chat'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
      <AiChat />
    </div>
  )
}

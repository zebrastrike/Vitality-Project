import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-t border-gray-300/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Image src="/logo.jpg" alt="The Vitality Project" width={240} height={90} className="h-14 w-auto object-contain mb-3" />
            <p className="text-gray-900/40 text-sm max-w-xs">
              Premium quality research compounds sourced and fulfilled with complete data privacy.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900/80 mb-3 text-sm">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-900/40">
              <li><Link href="/products" className="hover:text-gray-900 transition-colors">All Products</Link></li>
              <li><Link href="/products?category=repair-recovery" className="hover:text-gray-900 transition-colors">Repair & Recovery</Link></li>
              <li><Link href="/products?category=body-composition" className="hover:text-gray-900 transition-colors">Body Composition</Link></li>
              <li><Link href="/products?category=longevity-aesthetics" className="hover:text-gray-900 transition-colors">Longevity & Aesthetics</Link></li>
              <li><Link href="/products?category=neuro-mood" className="hover:text-gray-900 transition-colors">Neuro & Mood</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900/80 mb-3 text-sm">Learn</h4>
            <ul className="space-y-2 text-sm text-gray-900/40">
              <li><Link href="/what-are-peptides" className="hover:text-gray-900 transition-colors">What Are Peptides</Link></li>
              <li><Link href="/how-peptides-work" className="hover:text-gray-900 transition-colors">How They Work</Link></li>
              <li><Link href="/peptides-safety" className="hover:text-gray-900 transition-colors">Safety & Quality</Link></li>
              <li><Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900/80 mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-gray-900/40">
              <li><Link href="/about" className="hover:text-gray-900 transition-colors">About</Link></li>
              <li><Link href="/research" className="hover:text-gray-900 transition-colors">Research</Link></li>
              <li><Link href="/faq" className="hover:text-gray-900 transition-colors">FAQ</Link></li>
              <li><Link href="/shipping" className="hover:text-gray-900 transition-colors">Shipping Policy</Link></li>
              <li><Link href="/affiliate" className="hover:text-gray-900 transition-colors">Affiliates</Link></li>
              <li><Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* RUO Legal Block */}
        <div className="mt-8 pt-8 border-t border-gray-300/30">
          <div className="glass rounded-xl p-5 mb-6">
            <p className="text-gray-900/30 text-xs leading-relaxed">
              <strong className="text-gray-900/50">Research Use Only Disclaimer:</strong> All products sold by The Vitality Project are intended strictly for in vitro laboratory research and scientific study. They are not intended for human or animal consumption, diagnostic use, or therapeutic application. These products have not been evaluated by the Food and Drug Administration (FDA) and are not approved to diagnose, treat, cure, or prevent any disease or medical condition. By purchasing from this site you confirm you are a qualified researcher and agree to our{' '}
              <Link href="/terms" className="text-brand-400 hover:text-brand-300">Terms of Service</Link>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-900/20 text-xs">© {new Date().getFullYear()} The Vitality Project. All rights reserved.</p>
            <p className="text-gray-900/20 text-xs">Private infrastructure. No third-party data sharing.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

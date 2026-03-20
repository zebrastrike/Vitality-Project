import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="font-bold text-lg mb-3">
              THE <span className="text-gradient">VITALITY</span> PROJECT
            </div>
            <p className="text-white/40 text-sm max-w-xs">
              Premium quality peptides and performance compounds, sourced and delivered with complete data sovereignty.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white/80 mb-3 text-sm">Shop</h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/products?category=peptides" className="hover:text-white transition-colors">Peptides</Link></li>
              <li><Link href="/products?category=recovery" className="hover:text-white transition-colors">Recovery</Link></li>
              <li><Link href="/products?category=performance" className="hover:text-white transition-colors">Performance</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white/80 mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/affiliate" className="hover:text-white transition-colors">Affiliates</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} The Vitality Project. All rights reserved.
          </p>
          <p className="text-white/20 text-xs">
            Secure private infrastructure. No third-party cloud dependencies.
          </p>
        </div>
      </div>
    </footer>
  )
}

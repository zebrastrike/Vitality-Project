// /stacks — Curated bundle index. Each card → /stacks/<slug>.

import Link from "next/link";
import Image from "next/image";
import { STACKS } from "@/lib/stacks";

export const metadata = {
  title: "Stacks — Vitality Project",
  description:
    "Curated multi-peptide stacks. Pick the strength of each component, automatic bundle discount at checkout (2 → 5%, 3 → 10%, 4+ → 15%).",
};

export default function StacksIndexPage() {
  return (
    <main className="min-h-screen bg-[#0a0d12] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80 font-semibold">
            Curated Stacks
          </p>
          <h1 className="mt-2 text-4xl md:text-5xl font-semibold">
            Pre-built peptide protocols
          </h1>
          <p className="mt-3 text-white/55 leading-relaxed">
            Multi-peptide research kits with the right strengths chosen for each goal.
            Pick a strength for each component on the next page. Stack-based bundle
            discount applies automatically at checkout (2 peptides → 5% off,
            3 → 10%, 4 or more → 15%).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STACKS.map((s) => (
            <Link
              key={s.slug}
              href={`/stacks/${s.slug}`}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden hover:border-emerald-400/40 hover:bg-white/[0.04] transition-colors"
              data-testid={`stack-card-${s.slug}`}
            >
              <div className={`relative aspect-[5/3] bg-gradient-to-br ${s.accentClass ?? "from-white/[0.06] to-white/[0.02]"}`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="/products/vial-default-600.png"
                    alt={s.name}
                    width={220}
                    height={220}
                    className="object-contain opacity-90"
                  />
                </div>
                <div className="absolute top-3 left-3 rounded-md bg-black/40 backdrop-blur-sm px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/85 font-semibold">
                  {s.components.length}-peptide stack
                </div>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-semibold text-white group-hover:text-emerald-200">
                  {s.name}
                </h2>
                <p className="mt-1.5 text-sm text-white/55 leading-relaxed line-clamp-2">
                  {s.shortDesc}
                </p>
                <p className="mt-3 text-xs text-white/40">
                  {s.components.length} components · pick your strengths
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-6 max-w-2xl">
          <p className="text-sm text-emerald-200/90 font-medium">
            Auto-applied bundle discount on the cart
          </p>
          <p className="mt-1 text-xs text-white/55 leading-relaxed">
            Stack components count toward the volume discount alongside any
            single-vial peptides you add. 2 peptides total → 5%, 3 → 10%, 4 or
            more → 15%. Discount lands automatically at checkout — no code needed.
          </p>
        </div>
      </div>
    </main>
  );
}

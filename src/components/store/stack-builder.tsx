"use client";

// Client component for picking a strength of each peptide in a stack
// and adding the whole thing to the cart in one click.
//
// Each chosen variant lands as its own cart line item, which means the
// stack components automatically count toward the bundle discount tier
// table (2/3/4+ peptides → 5/10/15%).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

interface StackComponent {
  productId: string;
  productSlug: string;
  productName: string;
  blurb?: string;
  variants: Array<{ id: string; name: string; price: number; inventory: number }>;
  defaultVariantId: string | null;
}

interface Props {
  stackName: string;
  stackSlug: string;
  components: StackComponent[];
}

export function StackBuilder({ stackName, stackSlug, components }: Props) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const [picks, setPicks] = useState<Record<string, string>>(
    Object.fromEntries(
      components
        .map((c) => [c.productId, c.defaultVariantId ?? c.variants[0]?.id ?? ""])
        .filter(([, v]) => v),
    ),
  );
  const [added, setAdded] = useState(false);

  const selected = useMemo(() => {
    return components.map((c) => {
      const variantId = picks[c.productId];
      const variant = c.variants.find((v) => v.id === variantId) ?? c.variants[0];
      return { component: c, variant };
    });
  }, [components, picks]);

  const totalCents = selected.reduce((s, x) => s + (x.variant?.price ?? 0), 0);

  const handleAddStackToCart = () => {
    for (const { component, variant } of selected) {
      if (!variant) continue;
      addItem({
        productId: component.productId,
        variantId: variant.id,
        name: `${component.productName} — ${variant.name}`,
        price: variant.price,
        slug: component.productSlug,
        quantity: 1,
      });
    }
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      router.push("/cart");
    }, 1200);
  };

  return (
    <div className="space-y-5">
      {components.map((c) => {
        const picked = picks[c.productId];
        return (
          <div
            key={c.productId}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white">{c.productName}</h3>
                {c.blurb && <p className="text-xs text-white/45 mt-0.5">{c.blurb}</p>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {c.variants.map((v) => {
                const isPicked = v.id === picked;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setPicks((p) => ({ ...p, [c.productId]: v.id }))}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      isPicked
                        ? "border-emerald-400/60 bg-emerald-500/10 text-white"
                        : "border-white/[0.08] bg-white/[0.02] text-white/65 hover:border-white/25 hover:text-white"
                    }`}
                    data-testid={`stack-variant-${c.productSlug}-${v.id}`}
                  >
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-white/55 mt-0.5">${(v.price / 100).toFixed(2)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Bundle preview footer */}
      <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-emerald-300/80 font-semibold">
              Stack total — auto-discount applies at checkout
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              ${(totalCents / 100).toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-white/45">
              {components.length} peptides → {components.length >= 4 ? "15% off" : components.length === 3 ? "10% off" : "5% off"}
            </p>
          </div>

          <Button onClick={handleAddStackToCart} size="lg" className="shrink-0">
            {added ? (
              <>
                <Check className="w-4 h-4" /> Added — going to cart
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" /> Add stack to cart
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-white/35 text-center">
        Pay via Zelle. We email the send-to address right after you place the order.
        Items ship same day funds arrive.
      </p>
    </div>
  );
}

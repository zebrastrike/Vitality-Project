// POST /api/cart/discount — auto-applied bundle + member discount
//
// Input:  { items: [{ productId, price, quantity }] }
// Output: BundleResult shape from src/lib/bundle-discount.ts plus
//         memberDiscountCents and finalTotalCents so the checkout page
//         can render the breakdown directly.
//
// Subscriber-mode unlocks the more generous bundle table (2/3/4+ peptides
// → 5/10/15%) on top of the public table (3/6/10+). Membership is read
// from the authenticated session — anonymous carts get the public rates
// only.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBundleDiscount, type BundleCartItem } from "@/lib/bundle-discount";
import { getUserMembership, calculateMemberDiscount } from "@/lib/membership";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const rawItems: Array<{ productId: string; price: number; quantity: number }> = body.items;
  if (rawItems.length === 0) {
    return NextResponse.json({
      qualifyingCount: 0,
      qualifyingSubtotal: 0,
      discountPct: 0,
      discountCents: 0,
      tierLabel: null,
      nextTier: null,
      memberDiscountCents: 0,
      memberTier: "NONE",
      subtotalCents: 0,
      totalDiscountCents: 0,
      finalTotalCents: 0,
    });
  }

  // Look up each product's category slug — cart only carries productId
  const productIds = Array.from(new Set(rawItems.map((i) => i.productId).filter(Boolean)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, category: { select: { slug: true } } },
  });
  const categoryMap = new Map(products.map((p) => [p.id, p.category?.slug ?? null]));

  const items: BundleCartItem[] = rawItems.map((i) => ({
    productId: i.productId,
    categorySlug: categoryMap.get(i.productId) ?? null,
    price: Number(i.price) || 0,
    quantity: Number(i.quantity) || 0,
  }));

  // Membership status — drives subscriber-only bundle tier table
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const membership = userId ? await getUserMembership(userId) : { tier: "NONE" as const, benefits: { permanentDiscountPct: 0 } };
  const isSubscriber = membership.tier !== "NONE";

  const subtotalCents = items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Bundle discount (qualifying items only)
  const bundle = calculateBundleDiscount(items, { subscriber: isSubscriber });

  // Member permanent discount applies to the full cart subtotal
  // (including supplies / stacks). Stacks alongside bundle.
  const memberDiscountCents = calculateMemberDiscount(subtotalCents, membership.tier);

  const totalDiscountCents = bundle.discountCents + memberDiscountCents;
  const finalTotalCents = Math.max(0, subtotalCents - totalDiscountCents);

  return NextResponse.json({
    ...bundle,
    memberDiscountCents,
    memberTier: membership.tier,
    subtotalCents,
    totalDiscountCents,
    finalTotalCents,
  });
}

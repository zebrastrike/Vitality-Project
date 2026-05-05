import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", ".env.local") });

const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();

const cats = await p.category.findMany({
  where: { products: { some: { status: "ACTIVE" } } },
  include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  orderBy: { name: "asc" },
});
console.log("Active categories:\n");
for (const c of cats) {
  console.log(`  ${c.name.padEnd(28)} ${String(c._count.products).padStart(2)} products    /shop/${c.slug}`);
}

const totalProducts = await p.product.count({ where: { status: "ACTIVE" } });
const totalVariants = await p.productVariant.count();
console.log(`\nTotals: ${totalProducts} active products, ${totalVariants} variants`);

// Sample of new SKUs to confirm they look right
const sample = await p.product.findMany({
  where: { sku: { startsWith: "VP-" } },
  take: 5,
  include: { variants: true, category: true },
  orderBy: { name: "asc" },
});
console.log(`\nSample (5 of new VP-* products):`);
for (const s of sample) {
  console.log(`  ${s.name.padEnd(20)}  ${s.category?.name.padEnd(22)}  $${(s.price/100).toFixed(2)}+  ${s.variants.length} variant(s)`);
}

await p.$disconnect();

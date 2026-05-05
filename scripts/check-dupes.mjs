import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();

const dupes = await p.product.findMany({
  where: { name: { contains: "Bacteriostatic", mode: "insensitive" } },
  select: { id: true, name: true, sku: true, slug: true, status: true },
});
console.log("All bacteriostatic rows:", dupes.length);
for (const d of dupes) console.log(" ", d);

await p.$disconnect();

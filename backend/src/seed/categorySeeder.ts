import prisma from "../config/prisma.js";

export const CATEGORIES_DATA = [
  { name: "Sneakers", slug: "sneakers" },
  { name: "Boots", slug: "boots" },
  { name: "Athletic", slug: "athletic" },
  { name: "Formal", slug: "formal" },
  { name: "High Heels & Flats", slug: "heels-flats" },
];

/**
 * Seeder untuk tabel categories
 * Menggunakan upsert agar idempotent (bisa dijalankan berulang tanpa duplikasi)
 */
export async function seedCategories(): Promise<Map<string, number>> {
  console.log("📁 [START] Seeding Categories...");

  for (const cat of CATEGORIES_DATA) {
    await prisma.categories.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug },
    });
    console.log(`   ✓ Category: ${cat.name} (${cat.slug})`);
  }

  const allCategories = await prisma.categories.findMany({
    select: { id: true, slug: true },
  });

  const categoryMap = new Map<string, number>();
  allCategories.forEach((c) => categoryMap.set(c.slug, c.id));

  console.log(`✅ [SELESAI] Total ${categoryMap.size} kategori aktif siap digunakan.\n`);
  return categoryMap;
}

// Eksekusi jika dipanggil langsung via CLI: tsx src/seed/categorySeeder.ts
if (process.argv[1]?.endsWith("categorySeeder.ts")) {
  seedCategories()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("❌ Gagal seeding categories:", error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

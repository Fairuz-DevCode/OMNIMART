import prisma from "../config/prisma.js";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { gender_type } from "@prisma/client";
import { rawProducts } from "./data/productsData.js";
import { seedCategories } from "./categorySeeder.js";

/**
 * Helper untuk mengompres dan menyalin gambar produk ke public/img/products (*.webp)
 */
async function compressAndSave(sourceFileName: string, outputSlug: string): Promise<string> {
  const rootImgPath = path.resolve(process.cwd(), "..", "img", sourceFileName);
  const localImgPath = path.resolve(process.cwd(), "img", sourceFileName);
  const sourcePath = fs.existsSync(rootImgPath) ? rootImgPath : localImgPath;

  const targetDir = path.resolve(process.cwd(), "public", "img", "products");
  const targetFileName = `product-${outputSlug}.webp`;
  const targetPath = path.join(targetDir, targetFileName);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(sourcePath)) {
    await sharp(sourcePath)
      .resize(1000, 1000, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(targetPath);
    console.log(`   📸 Compressed & saved: ${targetFileName}`);
  } else {
    console.warn(`   ⚠️ Gambar sumber tidak ditemukan: ${sourcePath}`);
  }

  return `/uploads/products/${targetFileName}`;
}

/**
 * Seeder untuk 25 produk, varian ukuran, dan stok beserta kompresi gambar
 */
export async function seedProducts() {
  console.log("👕 [START] Seeding 25 Products, Variants & Image Compression...");

  // 1. Pastikan kategori sudah ada di database
  let categories = await prisma.categories.findMany({
    select: { id: true, slug: true },
  });

  if (categories.length === 0) {
    console.log("⚠️ Kategori belum ada, menjalankan seedCategories terlebih dahulu...");
    await seedCategories();
    categories = await prisma.categories.findMany({
      select: { id: true, slug: true },
    });
  }

  const catMap = new Map<string, number>();
  categories.forEach((c) => catMap.set(c.slug, c.id));

  // 2. Loop dan Upsert Produk
  let count = 0;
  for (const p of rawProducts) {
    count++;
    const categoryId = catMap.get(p.categorySlug) || categories[0]?.id || 1;
    const compressedImgUrl = await compressAndSave(p.imageSource, p.slug);

    const product = await prisma.products.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        slug: p.slug,
        gender: p.gender as gender_type,
        price: p.price,
        img_url: compressedImgUrl,
        description: p.description,
        category_id: categoryId,
      },
      create: {
        category_id: categoryId,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        gender: p.gender as gender_type,
        description: p.description,
        price: p.price,
        img_url: compressedImgUrl,
      },
      select: { id: true },
    });

    // 3. Upsert Varian Ukuran & Stok
    for (const v of p.variants) {
      const existingVariant = await prisma.product_variants.findFirst({
        where: { product_id: product.id, size: v.size },
      });

      if (existingVariant) {
        await prisma.product_variants.update({
          where: { id: existingVariant.id },
          data: { stock: v.stock },
        });
      } else {
        await prisma.product_variants.create({
          data: {
            product_id: product.id,
            size: v.size,
            stock: v.stock,
          },
        });
      }
    }

    console.log(`   [${count}/25] ✓ ${p.name} (${p.sku})`);
  }

  console.log("✅ [SELESAI] 25 Produk dan seluruh variannya berhasil di-seed!\n");
}

// Eksekusi jika dipanggil langsung via CLI: tsx src/seed/productSeeder.ts
if (process.argv[1]?.endsWith("productSeeder.ts")) {
  seedProducts()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("❌ Gagal seeding products:", error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

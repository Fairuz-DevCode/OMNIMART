import prisma from "../config/prisma.js";
import { seedCategories } from "./categorySeeder.js";
import { seedUsers } from "./userSeeder.js";
import { seedProducts } from "./productSeeder.js";

/**
 * Orkestrator Utama Database Seeder
 * Menjalankan proses seeding secara berurutan sesuai dependensi Foreign Key:
 * 1. Categories (Tabel Master)
 * 2. Users & Carts (Admin & Customer Demo)
 * 3. Products & Product Variants (25 produk lengkap dengan gambar terkompresi)
 */
async function runAllSeeds() {
  console.log("=================================================");
  console.log("🌱 [START] Menjalankan Seluruh Seeder Database");
  console.log("=================================================\n");
  const startTime = Date.now();

  try {
    // Tahap 1: Kategori
    await seedCategories();

    // Tahap 2: Pengguna & Keranjang Demo
    await seedUsers();

    // Tahap 3: Produk, Gambar & Varian
    await seedProducts();

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("=================================================");
    console.log(`🎉 [SUKSES] Semua database seeder selesai dalam ${totalSeconds} detik!`);
    console.log("=================================================");
  } catch (error) {
    console.error("💥 [ERROR] Terjadi kegagalan saat proses seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAllSeeds();

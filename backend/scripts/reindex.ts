import { prisma } from "../src/config/prisma.js";

/**
 * Script Maintenance Index Database (Defragmentasi / Reindex)
 * 
 * Menggunakan REINDEX TABLE CONCURRENTLY agar proses pembangunan ulang indeks
 * berjalan secara non-blocking di background tanpa mengunci tabel, sehingga user
 * tetap bisa berbelanja dan login dengan normal saat maintenance berlangsung.
 */

// Daftar tabel yang sering mengalami operasi INSERT, UPDATE, dan DELETE
const TARGET_TABLES = [
  "refresh_tokens",
  "cart_items",
  "carts",
  "orders",
  "order_items",
  "payments",
  "shippings",
  "product_variants",
  "products",
  "product_reviews",
  "wishlists",
  "addresses",
  "audit_logs",
  "users",
  "categories",
];

async function runIndexMaintenance() {
  console.log("=================================================");
  console.log("🚀 [START] Database Index Defragmentation / Reindex");
  console.log("=================================================");
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (const table of TARGET_TABLES) {
    const tableStart = Date.now();
    try {
      console.log(`⏳ [PROSES] Merapikan indeks tabel: "${table}"...`);
      
      // Menjalankan REINDEX TABLE CONCURRENTLY untuk memadatkan pohon B-Tree
      await prisma.$executeRawUnsafe(`REINDEX TABLE CONCURRENTLY "${table}";`);
      
      const duration = ((Date.now() - tableStart) / 1000).toFixed(2);
      console.log(`✅ [SUKSES] Tabel "${table}" selesai di-reindex (${duration} detik)`);
      successCount++;
    } catch (error: any) {
      failCount++;
      console.error(`❌ [GAGAL] Reindex tabel "${table}":`, error.message || error);
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n=================================================");
  console.log("📊 [RINGKASAN REINDEX]");
  console.log(`- Berhasil : ${successCount} tabel`);
  console.log(`- Gagal    : ${failCount} tabel`);
  console.log(`- Total Waktu : ${totalDuration} detik`);
  console.log("✨ Semua pohon indeks aktif kembali padat, rapi, dan cepat!");
  console.log("=================================================");

  await prisma.$disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

runIndexMaintenance().catch(async (error) => {
  console.error("💥 Terjadi kesalahan fatal saat maintenance:", error);
  await prisma.$disconnect();
  process.exit(1);
});

import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";

/**
 * Seeder untuk akun pengguna: Admin dan Customer Demo
 * Otomatis membuat cart default untuk user jika belum ada.
 */
export async function seedUsers() {
  console.log("👤 [START] Seeding Users & Default Carts...");

  const adminPass = await hashPassword("Admin123!");
  const userPass = await hashPassword("User123!");

  // 1. Seed Admin Utama
  const admin = await prisma.users.upsert({
    where: { email: "admin@nexa.com" },
    update: {
      role: "admin",
    },
    create: {
      name: "Nexa Admin",
      email: "admin@nexa.com",
      password: adminPass,
      role: "admin",
      phone: "08123456789",
    },
  });
  console.log(`   ✓ Admin: ${admin.email} (Role: ${admin.role})`);

  // 2. Seed Customer Demo
  const customer = await prisma.users.upsert({
    where: { email: "customer@nexa.com" },
    update: {},
    create: {
      name: "Customer Demo",
      email: "customer@nexa.com",
      password: userPass,
      role: "user",
      phone: "08987654321",
    },
  });
  console.log(`   ✓ Customer: ${customer.email} (Role: ${customer.role})`);

  // 3. Pastikan Customer Demo memiliki Cart default
  await prisma.carts.upsert({
    where: { user_id: customer.id },
    update: {},
    create: { user_id: customer.id },
  });
  console.log(`   ✓ Default Cart dibuat untuk user_id: ${customer.id}`);

  console.log("✅ [SELESAI] Akun Admin dan Customer Demo siap digunakan.\n");
  return { admin, customer };
}

// Eksekusi jika dipanggil langsung via CLI: tsx src/seed/userSeeder.ts
if (process.argv[1]?.endsWith("userSeeder.ts")) {
  seedUsers()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("❌ Gagal seeding users:", error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

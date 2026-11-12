# 08. Leaked Database Connection

## 1. Masalah yang Terjadi
Membuka koneksi baru ke database PostgreSQL adalah proses yang mahal (TCP handshake, SSL/TLS negotiation, otentikasi, alokasi memori). Karena itu, backend menggunakan **Connection Pool** (misal: 20 koneksi yang selalu siap pakai).

**Connection Leak (Kebocoran Koneksi)** terjadi ketika:
1. Backend meminjam 1 koneksi dari kolam, namun **lupa atau gagal mengembalikannya** ke kolam (misal terjadi *unhandled error* atau tidak ada blok `finally`).
2. Di masa pengembangan (*development*), menggunakan tool *hot-reload* seperti `tsx watch` atau `nodemon`: setiap kali file di-save (`Ctrl + S`), backend membuat instance client baru (`new PrismaClient()`) yang membuka 10 koneksi baru. Dalam 10 kali save, 100 koneksi PostgreSQL terbuka dan menumpuk hingga database *crash*.
3. Saat server dihentikan / di-restart (`Ctrl + C` atau `docker compose restart`), proses Node.js langsung mati mendadak tanpa menutup koneksi TCP secara rapi, meninggalkan **zombie / orphaned connections** di PostgreSQL.

---

## 2. Solusi Best Practice
1. **Global Singleton Pattern:**
   * Memastikan hanya ada 1 instance client database di memori Node.js, meskipun file di-load ulang saat hot-reload.
2. **Release di Blok `finally`:**
   * Jika menggunakan raw connection driver (`pg`), rilis koneksi wajib diletakkan di dalam blok `finally` agar pasti dieksekusi baik saat query sukses maupun gagal.
3. **Graceful Shutdown Handling:**
   * Menangkap sinyal OS (`SIGINT` dan `SIGTERM`) untuk memutuskan seluruh koneksi database dan Redis secara rapi sebelum proses Node.js dihentikan.
4. **Disconnect pada Skrip Mandiri:**
   * Skrip cron / migration / seeder wajib memanggil pemutusan koneksi eksplisit sebelum `process.exit()`.

---

## 3. Implementasi di Project Ini

Project ini menerapkan perlindungan menyeluruh terhadap kebocoran koneksi:

### A. Prisma Global Singleton di [`backend/src/config/prisma.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts)
```typescript
declare global {
  var prisma: PrismaClient | undefined;
}

// Menggunakan instance yang sudah ada di memori global saat hot-reload
export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
```
* **Hasil:** Menekan `Ctrl + S` puluhan kali saat coding tidak akan pernah membocorkan koneksi ke PostgreSQL.

### B. Graceful Shutdown di [`backend/src/server.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L11-L36)
```typescript
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down server gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Database connection closed.");

      redis.disconnect();
      console.log("Redis connection closed.");

      process.exit(0);
    } catch (err) {
      console.error("Error during graceful shutdown:", err);
      process.exit(1);
    }
  });

  // Force shutdown jika proses macet lebih dari 10 detik
  setTimeout(() => {
    console.error("Forced shutdown due to timeout.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

### C. Safe Driver Wrapper di [`backend/src/config/db.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/db.ts#L26-L41)
```typescript
export const withTransaction = async <T>(callback: (client) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release(); // KONEKSI PASTI DIKEMBALIKAN KE POOL APAPUN YANG TERJADI
  }
};
```

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Bebas dari kebocoran koneksi berkat Prisma global singleton, blok `finally { client.release() }` di driver pg murni, dan Graceful Shutdown OS handler (`SIGTERM`/`SIGINT`).

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Transaction-Level Statement Timeout (`SET statement_timeout`):**  
   Jika developer secara keliru memanggil API eksternal (seperti Midtrans/Email) di dalam blok transaksi dan API tersebut mengalami delay 60 detik, koneksi database akan tertahan dalam status `idle in transaction`. Batasan mentoknya adalah menyetel batas mutlak:
   ```sql
   SET LOCAL statement_timeout = '10000'; -- Putus paksa jika transaksi melebihi 10 detik
   ```
2. **Zombie Connection Reaper Worker:**  
   Belum ada cron worker yang secara otomatis memindai `pg_stat_activity` untuk mencari koneksi dengan status `idle in transaction` berumur > 30 detik dan mengeksekusi `pg_terminate_backend(pid)` untuk menyelamatkan pool koneksi dari kehabisan resource.

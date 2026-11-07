# 09. Database Connection Pool Exhaustion

## 1. Masalah yang Terjadi
**Connection Pool Exhaustion** adalah kondisi di mana **seluruh kapasitas koneksi di kolam (pool) sedang terpakai 100%**, sehingga request baru dari pembeli yang datang tidak kebagian koneksi sama sekali.

Penyebab utamanya:
1. **Slow Queries (Query Lambat):** Query pencarian produk tanpa indeks menahan koneksi selama 3-5 detik. Jika ada 20 user bersamaan, seluruh 20 koneksi di pool terkunci.
2. **Transaksi Database Terlalu Lama:** Menaruh proses I/O luar (seperti request HTTP ke payment gateway Midtrans atau pengiriman email) di dalam `prisma.$transaction`.
3. **Lonjakan Trafik (Flash Sale):** Ribuan user mengakses katalog bersamaan, membanjiri database utama dengan query `SELECT`.

**Akibatnya:**
* Pembeli baru mengalami *timeout* atau halaman web membeku (*blank screen*).
* Database melempar error kritis:
  `Error: P2024: Timed out fetching a new connection from the connection pool`.

---

## 2. Solusi Best Practice
1. **Connection Pool Tuning:**
   * Menetapkan batas maksimal koneksi (`connection_limit`) yang sesuai dengan kapasitas RAM database.
   * Menetapkan batas waktu tunggu antrean (*fail-fast*) via `pool_timeout`.
2. **Selective Redis Caching:**
   * Menyimpan data yang sering dibaca dan variasinya sedikit (detail produk, kategori) di dalam RAM Redis, sehingga 90% request tidak perlu menyentuh PostgreSQL.
3. **Transaksi Database yang Singkat:**
   * Hanya menyertakan manipulasi SQL penting di dalam `$transaction`. Semua pemanggilan API luar dan pembersihan cache diletakkan **di luar transaksi**.
4. **Read/Write Splitting (Database Replikasi):**
   * Memisahkan lalu lintas: Operasi `WRITE` (checkout, bayar) dikirim ke Database Primary, sedangkan operasi `READ` yang dinamis dan bervariasi tinggi dikirim ke Database Read Replica.

---

## 3. Implementasi di Project Ini

### A. Tuning Pool di [`backend/.env`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/.env#L10)
```env
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/db_nexa?connection_limit=20&pool_timeout=10"
```
* `connection_limit=20`: Membatasi agar aplikasi maksimal memegang 20 koneksi, mencegah backend membuat PostgreSQL kehabisan RAM.
* `pool_timeout=10`: Jika pool sedang penuh, request maksimal menunggu 10 detik sebelum melempar error daripada menggantung selamanya.

### B. Transaksi Singkat di [`order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L33-L120)
Saat checkout, seluruh pemanggilan Redis invalidation diletakkan **setelah** `$transaction` selesai:
```typescript
const result = await prisma.$transaction(async (tx) => {
  // Hanya eksekusi query database kilat (< 15ms):
  // 1. Validasi stok batch
  // 2. Buat order record
  // 3. Potong stok varian
  // 4. Kosongkan keranjang
});

// Panggilan Redis & I/O lainnya DI LUAR blok transaksi:
redis.del(`cart:user:${userId}`).catch((err) => console.warn(err));
deleteKeysByPattern("products:*");

return result;
```

### C. Strategi Selective Caching di [`product.routes.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.routes.ts#L35-L48)
```typescript
// 1. Variasi kecil (Katalog default tanpa search/cursor): Cache di Redis 10 menit (600s)
//    Variasi besar (Pencarian teks bebas, pagination cursor dalam): Bypass cache -> Database
router.get(
  "/",
  cacheResponse(600, "products", {
    shouldSkip: (req) => Boolean(req.query.search || req.query.cursor),
  }),
  ProductController.getProduct
);

// 2. Detail produk & slug (variasi kecil, dibatasi jumlah produk): Cache di Redis 10 menit
router.get("/:id", cacheResponse(600, "products"), ProductController.getProductDetail);
```

### D. Read/Write Splitting via `@prisma/extension-read-replicas`
Diterapkan di [`backend/src/config/prisma.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts):
```typescript
const replicaUrl = process.env.DATABASE_REPLICA_URL;

if (replicaUrl) {
  // Seluruh query findMany, filter dinamis, dan pencarian otomatis dilempar ke DB Replica
  return baseClient.$extends(
    readReplicas({
      url: replicaUrl,
    })
  );
}
```
* **Hasil:** Query pencarian rumit yang mem-bypass cache Redis akan dilayani oleh **Database Read Replica**. Database Primary (tempat kasir memproses pesanan belanja) tetap tenang, aman dari risiko *connection pool exhaustion*.

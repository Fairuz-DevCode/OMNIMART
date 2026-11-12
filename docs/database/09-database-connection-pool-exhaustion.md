# 09. Database Connection Pool Exhaustion & PgBouncer

## 1. Masalah yang Terjadi
**Connection Pool Exhaustion** adalah kondisi di mana **seluruh kapasitas koneksi di kolam (pool) sedang terpakai 100%**, sehingga request baru dari pembeli yang datang tidak kebagian koneksi sama sekali.

Penyebab utamanya:
1. **Slow Queries (Query Lambat):** Query pencarian produk tanpa indeks menahan koneksi selama 3-5 detik. Jika ada 20 user bersamaan, seluruh 20 koneksi di pool terkunci.
2. **Transaksi Database Terlalu Lama:** Menaruh proses I/O luar (seperti request HTTP ke payment gateway Midtrans atau pengiriman email) di dalam `prisma.$transaction`.
3. **Keterbatasan Fisik PostgreSQL (Process-per-Connection):**
   * PostgreSQL membuat 1 proses OS terpisah untuk setiap 1 koneksi baru dari backend.
   * Setiap koneksi memakan **5 MB – 10 MB RAM**. Jika backend membuka 300 koneksi bersamaan, database menghabiskan **1.5 GB – 3 GB RAM** hanya untuk menjaga soket koneksi tetap terbuka, sebelum query dieksekusi.
   * Backend dengan banyak worker atau container mudah membentur limit `max_connections` (default 100 di PostgreSQL), memicu error kritis:
     `FATAL: sorry, too many clients already connected` atau
     `Error: P2024: Timed out fetching a new connection from the connection pool`.

---

## 2. Solusi Best Practice

```text
[ Backend Express / Prisma ]
    │ (Bisa menampung 500 koneksi ringan ke pooler)
    ▼
[ PgBouncer (Port: 6432) ] <--- Lightweight Connection Pooler (Transaction Mode)
    │ (Cuma butuh 20 koneksi fisik riil ke Postgres)
    ▼
[ PostgreSQL (Port: 5432) ]
```

1. **Memasang Connection Pooler (PgBouncer):**
   * Berdiri di depan PostgreSQL menggunakan mode **Transaction Pooling**. Koneksi fisik ke PostgreSQL hanya dipinjam selama transaksi SQL berlangsung (hitungan milidetik), lalu langsung dilepas. Rasio efisiensi: 20 koneksi fisik ke PostgreSQL sanggup melayani **ratusan request bersamaan** dari banyak container backend.
2. **Connection Pool Tuning di Level Aplikasi:**
   * Menetapkan batas maksimal koneksi (`connection_limit`) yang sesuai dengan kapasitas RAM database.
   * Menetapkan batas waktu tunggu antrean (*fail-fast*) via `pool_timeout`.
3. **Selective Redis Caching:**
   * Menyimpan data yang sering dibaca dan variasinya sedikit (detail produk, kategori) di dalam RAM Redis, sehingga 90% request tidak perlu menyentuh PostgreSQL.
4. **Transaksi Database yang Singkat:**
   * Hanya menyertakan manipulasi SQL penting di dalam `$transaction`. Semua pemanggilan API luar dan pembersihan cache diletakkan **di luar transaksi**.
5. **Read/Write Splitting (Database Replikasi):**
   * Memisahkan lalu lintas: Operasi `WRITE` (checkout, bayar) dikirim ke Database Primary, sedangkan operasi `READ` yang dinamis dan bervariasi tinggi dikirim ke Database Read Replica.

---

## 3. Implementasi di Project Ini

### A. Service PgBouncer di [`docker-compose.yml`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docker-compose.yml)
Menggunakan container image `edoburu/pgbouncer:latest` yang berdiri di antara `backend` dan `db`:

```yaml
pgbouncer:
  image: edoburu/pgbouncer:latest
  container_name: nexa_pgbouncer
  restart: always
  depends_on:
    db:
      condition: service_healthy
  environment:
    - DB_HOST=db
    - DB_PORT=5432
    - DB_USER=${DB_USER:-postgres}
    - DB_PASSWORD=${DB_PASSWORD:-admin123}
    - DB_NAME=${DB_NAME:-db_nexa}
    - LISTEN_PORT=6432
    - POOL_MODE=transaction          # Mode transaksi untuk efisiensi maksimal
    - MAX_CLIENT_CONN=500            # Sanggup tampung 500 koneksi dari aplikasi
    - DEFAULT_POOL_SIZE=20           # Cuma butuh 20 koneksi fisik ke PostgreSQL
    - MIN_POOL_SIZE=5
    - RESERVE_POOL_SIZE=5
    - IGNORE_STARTUP_PARAMETERS=extra_float_digits
    - AUTH_TYPE=scram-sha-256
  ports:
    - "${PGBOUNCER_PORT:-6432}:6432"
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -p 6432 -U ${DB_USER:-postgres} -d ${DB_NAME:-db_nexa}"]
    interval: 5s
    timeout: 5s
    retries: 5
```

### B. Konfigurasi Prisma Dual URL di [`schema.prisma`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma#L5-L9)
Prisma memisahkan antara koneksi pooler untuk query runtime dan koneksi direct untuk migrasi database:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")  # Lewat PgBouncer (Port 6432)
  directUrl = env("DIRECT_URL")    # Langsung ke Postgres (Port 5432)
}
```

1. **`DATABASE_URL` (Port 6432 + `?pgbouncer=true`):** Digunakan oleh server backend Express saat melayani traffic belanja pelanggan. Parameter `pgbouncer=true` memberitahu Prisma untuk otomatis mengeksekusi `DEALLOCATE ALL` dan menyesuaikan mekanisme prepared statements dengan transaction pooling PgBouncer.
2. **`DIRECT_URL` (Port 5432):** Digunakan otomatis oleh Prisma CLI saat mengeksekusi `prisma migrate deploy` (karena DDL migration membutuhkan penguncian tabel yang memerlukan sesi direct).

### C. Konfigurasi Environment di [`backend/.env.example`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/.env.example#L5-L16)
```env
# Koneksi Aplikasi Sehari-hari (Lewat PgBouncer Port 6432)
DATABASE_URL="postgresql://postgres:admin123@localhost:6432/db_nexa?pgbouncer=true&connection_limit=50"

# Koneksi Khusus Migrasi Database (Langsung ke Postgres Port 5432)
DIRECT_URL="postgresql://postgres:admin123@localhost:5432/db_nexa"
```

### D. Transaksi Singkat di [`order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L33-L120)
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

### E. Strategi Selective Caching di [`product.routes.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.routes.ts#L35-L48)
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

### F. Read/Write Splitting via `@prisma/extension-read-replicas`
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
* **Hasil:** Query pencarian rumit yang mem-bypass cache Redis akan dilayani oleh **Database Read Replica**. Database Primary (tempat kasir memproses pesanan belanja) terlindungi dari lonjakan beban koneksi.

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Arsitektur dual-URL (PgBouncer port 6432 untuk transactional pooling + Direct URL port 5432 untuk migrasi DDL), isolasi batas pool (`connection_limit=20`), offload Redis, dan Read Replica sudah aktif.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Centralized Enterprise Connection Pooler (Multi-Pod Cluster):**  
   Saat ini PgBouncer masih berjalan sebagai single instance lokal. Jika backend di-scale horizontal di Kubernetes menjadi 30 Pod (30 Pod x 20 koneksi = 600 koneksi), PostgreSQL tetap bisa kehabisan resource. Batasan mentoknya adalah mengadopsi Managed Connection Proxy (seperti AWS RDS Proxy atau HA-PgBouncer dengan Pgpool-II) yang menyerap ribuan koneksi stateless container ke dalam kolam statis 50 koneksi database riil.
2. **Fast-Fail Application Circuit Breaker saat Pool Jenuh:**  
   Jika antrean pool database penuh, Node.js masih menunggu hingga `connectionTimeoutMillis: 5000` habis. Batasan mentoknya adalah membaca metrik pool (`pool.waitingCount > 50`) dan langsung melempar respons `HTTP 503 Service Temporarily Unavailable` dalam 1 milidetik tanpa membiarkan worker thread tertahan.

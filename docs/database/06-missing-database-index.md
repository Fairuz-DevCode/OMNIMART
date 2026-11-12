# 06. Missing Database Index

## 1. Masalah yang Terjadi
Secara default, baris-baris data dalam tabel disimpan di disk dalam format **Heap** tanpa urutan tertentu.

Ketika Anda menjalankan query pencarian:
```sql
SELECT * FROM orders WHERE user_id = 99;
```
Jika kolom `user_id` **tidak memiliki indeks (Missing Index)**:
* Database terpaksa melakukan **Sequential Scan (Full Table Scan)**: membaca jutaan baris satu demi satu dari hardisk ke RAM untuk memeriksa baris mana yang cocok.
* CPU dan I/O disk server melonjak drastis hingga 90-100%.
* Latensi response aplikasi lambat (dari 2ms melonjak ke beberapa detik).
* APM / Monitoring tool akan melaporkan peringatan: *"Missing Index on table orders (user_id)"*.

---

## 2. Solusi Best Practice
Membangun struktur data pohon seimbang (**B-Tree Index**) pada kolom-kolom yang sering digunakan dalam klausa:
1. **Foreign Key Columns:** (`user_id`, `category_id`, `product_id`).
2. **Klausa Pencarian & Filter:** (`slug`, `email`, `status`, `deleted_at`).
3. **Klausa Pengurutan & Pagination:** (`created_at DESC`).
4. **Indeks Komposit (Multi-Column Index):** Menggabungkan 2 kolom atau lebih jika sering dicari bersamaan (misal: mencari order milik user tertentu diurutkan dari yang terbaru).

---

## 3. Implementasi di Project Ini

Seluruh strategi indeks dirancang eksplisit di skema Prisma:
[`backend/prisma/schema.prisma`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma)

### A. Indeks Tabel `products` (Katalog & Filter)
```prisma
model products {
  id               Int        @id @default(autoincrement())
  sku              String     @unique @db.VarChar
  slug             String     @unique @db.VarChar
  category_id      Int
  gender           GenderType
  deleted_at       DateTime?

  @@index([category_id])              // Optimasi filter kategori
  @@index([slug])                     // Optimasi lookup halaman produk
  @@index([gender])                   // Optimasi filter pria/wanita
  @@index([deleted_at])               // Optimasi soft-delete filter
  @@index([category_id, deleted_at])  // Indeks komposit kategori yang masih aktif
}
```

### B. Indeks Tabel `orders` (Riwayat Pesanan & Status)
```prisma
model orders {
  id           Int         @id @default(autoincrement())
  order_number String      @unique @db.VarChar
  user_id      Int
  status       OrderStatus
  created_at   DateTime    @default(now())

  @@index([user_id])
  @@index([order_number])
  @@index([status])
  @@index([created_at(sort: Desc)])
  @@index([user_id, created_at(sort: Desc)]) // Super cepat untuk "Riwayat Pesanan Saya"
}
```

### C. Indeks Tabel `refresh_tokens` (Auth Churn)
```prisma
model refresh_tokens {
  id         Int      @id @default(autoincrement())
  user_id    Int
  token      String   @db.VarChar
  expires_at DateTime

  @@index([user_id])
  @@index([token]) // Lookup token jwt refresh instan < 1ms
}
```

### D. Indeks Varian & Keranjang Belanja
* `product_variants`: `@@index([product_id])` dan `@@index([product_id, size])`.
* `cart_items`: `@@index([cart_id])`, `@@index([product_id])`, `@@index([product_variant_id])`.
* `product_reviews`: `@@index([product_id, created_at(sort: Desc)])`.

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Seluruh kolom kunci pencarian, foreign keys relasional, dan composite indexes (`user_id, created_at DESC`) sudah terindeks optimal untuk memangkas *sequential scan* menjadi *index scan*.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Partial / Filtered Indexes (Hemat RAM & Write I/O):**  
   Saat ini indeks status order mengindeks seluruh 100% baris di tabel. Batasan mentoknya adalah *Partial Index* di PostgreSQL: `CREATE INDEX idx_orders_unpaid ON orders (created_at) WHERE status = 'PENDING_PAYMENT'`. Indeks ini hanya memakan 2% ukuran memori RAM dan mempercepat kueri pengecekan order aktif tanpa membebani penulisan histori pesanan selesai.
2. **Unused Index Telemetry & Cleanup Audit:**  
   Belum ada script monitoring berkala yang membaca view internal PostgreSQL `pg_stat_user_indexes` untuk mendeteksi indeks dengan nilai `idx_scan = 0` (indeks yang tidak pernah digunakan oleh query planner), sehingga indeks yang sia-sia dan memperlambat `INSERT/UPDATE` dapat dieliminasi secara sistematis.

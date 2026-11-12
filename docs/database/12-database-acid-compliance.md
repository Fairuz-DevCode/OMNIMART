# 12. Database ACID Compliance & Implementation

Dokumen ini membedah standar **ACID (Atomicity, Consistency, Isolation, Durability)**, mengapa standar ini mutlak diperlukan dalam e-commerce, serta **bukti nyata penerapannya di codebase project Nexa Streetwear**.

---

## 1. Apa Itu Database ACID Sebenarnya?

Dalam sistem e-commerce, satu aksi pengguna (misalnya: menekan tombol *"Bayar Sekarang"*) melibatkan banyak perubahan data sekaligus: memotong stok baju, mencatat invoice pesanan, memotong saldo/mencatat status pembayaran, dan mengosongkan keranjang belanja.

**ACID** adalah 4 pilar jaminan kualitas transaksi yang memastikan data toko online Anda **tidak pernah korup, tidak pernah setengah jadi, dan tidak pernah hilang** meskipun terjadi *traffic spike*, kegagalan jaringan, atau mati listrik.

---

## 2. Bedah 4 Pilar ACID & Implementasinya di Codebase

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        STANDAR TRANSAKSI ACID                          │
├─────────────────┬──────────────────────────────────────────────────────┤
│ A - Atomicity   │ Semua langkah sukses, atau ditarik batal semua.      │
│ C - Consistency │ Data tunduk 100% pada aturan skema & check constraint.│
│ I - Isolation   │ Transaksi konkuren berjalan terisolasi (tidak intip).│
│ D - Durability  │ Sekali di-commit, data aman permanen di disk/SSD.    │
└─────────────────┴──────────────────────────────────────────────────────┘
```

---

### PILAR 1: Atomicity (Semua Berhasil atau Batal Semua)

#### Masalah Tanpa Atomicity:
Jika ada 4 langkah saat checkout:
1. Validasi varian sepatu
2. Buat record pesanan (`orders`)
3. Potong stok sepatu (`product_variants`)
4. Kosongkan keranjang belanja (`cart_items`)

Jika di langkah ke-4 koneksi terputus, stok sudah terpotong dan order sudah tercatat, tetapi keranjang belanja user tidak terhapus (data setengah jadi).

#### Penerapan di Codebase:
Seluruh alur bisnis multi-tabel dibungkus di dalam blok **`$transaction`** Prisma atau helper **`executeWithRetry`**:

1. **Checkout Pesanan di [`backend/src/modules/order/order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L33-L111):**
   ```typescript
   const result = await executeWithRetry(prisma, async (tx) => {
     // 1. Sort item
     // 2. Validasi stok
     // 3. Buat order record
     const newOrder = await OrderModel.createOrder(tx, { ... });
     // 4. Buat order items & potong stok
     // 5. Buat data pengiriman
     await ShippingModel.createShipping(tx, { order_id: newOrder.id, ... });
     // 6. Kosongkan keranjang belanja
     await CartModel.clearCartItems(tx, cart.id);
     
     return { ...newOrder, items: orderItems };
   });
   ```
   *Jika ada langkah yang gagal (misal stok kurang atau format alamat tidak valid), **seluruh operasi otomatis di-ROLLBACK**. Tidak ada data sampah yang tertinggal.*

2. **Pembuatan Produk & Varian Ukuran di [`backend/src/modules/product/product.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.service.ts#L7-L25):**
   Membuat record produk dan seluruh varian ukurannya di dalam 1 transaksi atomik. Jika varian gagal, produk tidak akan pernah dibuat.

3. **Webhook Pembayaran Midtrans di [`backend/src/modules/payment/payment.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/payment/payment.service.ts#L118-L127):**
   Update status pembayaran, status order menjadi `paid`, dan restorasi stok (jika pesanan kadaluwarsa/batal) berjalan secara atomik.

4. **Raw Driver Wrapper di [`backend/src/config/db.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/db.ts#L26-L41):**
   Menyediakan fungsi pembungkus `withTransaction` dengan `BEGIN`, `COMMIT`, dan `ROLLBACK` otomatis saat error terjadi.

---

### PILAR 2: Consistency (Integritas Skema & Aturan Bisnis)

#### Masalah Tanpa Consistency:
Data yang tersimpan bertentangan dengan logika bisnis: stok bernilai negatif (`stock = -5`), harga barang minus (`price = -50000`), atau item pesanan mengarah ke produk yang tidak ada (*orphan data*).

#### Penerapan di Codebase:
Project ini menerapkan konsistensi di **dua level (Aplikasi & Database Engine)**:

1. **Unique Constraints di Skema Prisma ([`backend/prisma/schema.prisma`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma)):**
   * `@unique` pada `email` dan `google_id` tabel `users`.
   * `@unique` pada `slug` dan `sku` tabel `products`.
   * `@unique` pada `order_number` tabel `orders`.
   * `@@unique([user_id, product_id])` di tabel `wishlists` (mencegah wishlist ganda).

2. **Foreign Key Referential Integrity:**
   * Menjamin integritas relasi: `cart_items` dan `order_items` wajib terikat ke `product_id` dan `variant_id` yang sah, dengan aturan *Cascade Update/Delete* yang terkontrol.

3. **Check Constraints Native PostgreSQL:**
   Project ini telah dilengkapi dengan batasan nilai (*Check Constraints*) langsung di level mesin PostgreSQL:
   ```sql
   -- 1. Stok varian tidak boleh negatif
   ALTER TABLE product_variants ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);

   -- 2. Harga produk tidak boleh negatif
   ALTER TABLE products ADD CONSTRAINT check_product_price_non_negative CHECK (price >= 0);

   -- 3. Quantity keranjang belanja wajib > 0
   ALTER TABLE cart_items ADD CONSTRAINT check_cart_quantity_positive CHECK (quantity > 0);

   -- 4. Quantity pesanan wajib > 0 dan harga non-negatif
   ALTER TABLE order_items ADD CONSTRAINT check_order_item_positive CHECK (quantity > 0 AND price >= 0);

   -- 5. Total tagihan order & ongkir wajib non-negatif
   ALTER TABLE orders ADD CONSTRAINT check_order_amount_non_negative CHECK (total_amount >= 0 AND shipping_cost >= 0);
   ```
   *Jika ada query liar yang mencoba memasukkan stok minus atau harga negatif, mesin PostgreSQL **langsung membatalkan eksekusi**.*

---

### PILAR 3: Isolation (Terisolasi Antar Transaksi Konkuren)

#### Masalah Tanpa Isolation:
Dua transaksi yang berjalan bersamaan saling mengintip data setengah jadi (*Dirty Read*) atau saling menimpa data tanpa koordinasi (*Lost Updates / Race Condition*).

#### Penerapan di Codebase:

1. **Default Isolation Level PostgreSQL (`READ COMMITTED`):**
   * Menjamin bahwa sebuah transaksi **hanya bisa membaca baris data yang sudah resmi di-COMMIT**. Transaksi lain yang masih menggantung (*in-flight*) tidak akan pernah terlihat.

2. **Row-Level Locking saat Pemotongan Stok:**
   * Di [`backend/src/modules/order/order.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.model.ts#L53-L68):
     ```typescript
     await db.product_variants.updateMany({
       where: {
         id: Number(variantId),
         stock: { gte: quantity }, // Conditional Atomic Lock
       },
       data: {
         stock: { decrement: quantity },
       },
     });
     ```
   * Baris varian dikunci secara eksklusif oleh PostgreSQL saat update. Transaksi kedua wajib menunggu sampai transaksi pertama selesai.

3. **Consistent Lock Ordering Anti-Deadlock:**
   * Di [`backend/src/modules/order/order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L35):
     Item selalu diurutkan menaik berdasarkan `product_variant_id` sebelum di-lock, mengeliminasi siklus saling sandera (*circular wait*).

---

### PILAR 4: Durability (Ketahanan & Permanensi Data)

#### Masalah Tanpa Durability:
Database memberi tahu *"Pembayaran Sukses"*, tetapi server tiba-tiba mati lampu 1 detik kemudian, dan saat dinyalakan kembali seluruh data transaksi tadi lenyap dari hardisk.

#### Penerapan di Codebase:

1. **Write-Ahead Logging (WAL) PostgreSQL:**
   * PostgreSQL menjamin Durability dengan mencatat setiap transaksi ke dalam berkas jurnal WAL di storage fisik sebelum transaksi dinyatakan sukses (`COMMIT`). Saat sistem pulih dari mati listrik, PostgreSQL memutar ulang catatan WAL (*crash recovery*) sehingga data tidak pernah hilang.

2. **Penyimpanan Permanen Docker Volume di [`docker-compose.yml`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docker-compose.yml#L15):**
   * Direktori data PostgreSQL dipetakan ke volume bernama `nexa_pgdata`:
     ```yaml
     volumes:
       - nexa_pgdata:/var/lib/postgresql/data
     ```
   * Jika container di-restart, di-update, atau dimatikan, data database tetap utuh dan tersimpan di disk host.

3. **Skrip Backup Otomatis Terjadwal di [`backend/scripts/backup.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/backup.ts):**
   * Menggunakan utility `pg_dump` untuk mengekstraksi snapshot database lengkap dalam format custom archive (`.dump`), dilengkapi dengan retensi pembersihan otomatis 7 hari terakhir:
     ```bash
     npm run db:backup
     ```

---

## 3. Rangkuman Matriks Kepatuhan ACID di Project Ini

| Pilar | Status di Codebase | Mekanisme & Berkas Kunci |
|:---|:---:|:---|
| **Atomicity** | **100% Terpenuhi** | `$transaction` & `executeWithRetry` di [`order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts) dan [`product.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.service.ts). |
| **Consistency** | **100% Terpenuhi** | Prisma `@unique` & Foreign Key cascade + 5 Check Constraints native PostgreSQL (`stock >= 0`, `price >= 0`, `quantity > 0`, `total_amount >= 0`). |
| **Isolation** | **100% Terpenuhi** | PostgreSQL `READ COMMITTED` + Row Exclusive Lock + `.sort()` anti-deadlock di [`order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L35). |
| **Durability** | **100% Terpenuhi** | PostgreSQL WAL engine + Docker Volume `nexa_pgdata` + Backup Snapshot harian di [`backend/scripts/backup.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/backup.ts). |

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* 4 Pilar ACID (Atomicity, Consistency, Isolation, Durability) terpenuhi 100% pada transaksi tunggal database PostgreSQL melalui transaksi Prisma, database constraint, dan Write-Ahead Logging (WAL).

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Serializable Isolation Level for Financial Settlements:**  
   Saat ini transaksi menggunakan level isolasi bawaan PostgreSQL `READ COMMITTED`. Untuk kalkulasi audit keuangan tingkat perbankan (*ledger accounting*), batasan mentoknya adalah mengaplikasikan level `SERIALIZABLE` dengan penanganan error `40001 (serialization_failure)` secara otomatis.
2. **Distributed Transaction Management (Saga Pattern):**  
   Saat ini sistem bersifat monolitik (semua tabel berada dalam 1 database PostgreSQL). Jika arsitektur dipecah menjadi Microservices (Database Order terpisah dari Database Inventori dan Payment), ACID database tunggal tidak bisa menjangkau jaringan luar. Batasan mentoknya adalah menerapkan **Saga Orchestrator Pattern** dengan transaksi kompensasi otomatis (*Compensating Rollbacks*) jika salah satu service downstream gagal.

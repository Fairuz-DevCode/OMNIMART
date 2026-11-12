# 13. Soft Delete vs Hard Delete Implementation Guide

Dokumen ini membedah perbedaan mendasar antara **Soft Delete** dan **Hard Delete**, bahaya fatal jika salah menerapkannya di e-commerce, logika pemfilteran `deleted_at` untuk Frontend/API, matriks keputusan per entitas tabel, serta **implementasi nyata dan proteksi data di codebase project Nexa Streetwear**.

---

## 1. Apa Perbedaan Soft Delete vs Hard Delete?

| Pembeda | Hard Delete (Hapus Fisik) | Soft Delete (Hapus Logis / Ditandai) |
|:---|:---|:---|
| **Perintah SQL** | `DELETE FROM table WHERE id = X;` | `UPDATE table SET deleted_at = NOW() WHERE id = X;` |
| **Status Data di Disk** | Musnah permanen dari media penyimpanan fisik (SSD/disk). | Data **tetap utuh tersimpan di disk**, hanya diberi stempel tanggal kadaluwarsa/arsip. |
| **Keterpulihan (Recovery)** | Mustahil dipulihkan kecuali restore database dari dump backup. | **Sangat mudah dipulihkan** cukup dengan `UPDATE table SET deleted_at = NULL;`. |
| **Dampak Relasi (Foreign Key)** | Rawan merusak riwayat transaksi atau memicu *Foreign Key Constraint Violation*. | **100% Aman:** Riwayat pesanan dan relasi data masa lalu tetap utuh. |

---

## 2. Mengapa Hard Delete Adalah Bencana Besar di Toko Online?

Bayangkan toko streetwear Anda pernah menjual jaket *"Alpha Hoodie"* (ID: 10) kepada 50 pembeli bulan lalu. Riwayat pesanan mereka tersimpan di tabel `order_items` dengan `product_id = 10` dan pengiriman merujuk ke `addresses.id = 5`.

Jika admin toko atau pembeli menghapus data menggunakan **Hard Delete**:
1. **Error Foreign Key Restrict:** PostgreSQL akan menolak penghapusan karena ID masih terikat ke tabel `orders` / `order_items`, memicu error sistem 500 dan memblokir aksi user.
2. **Bencana Cascade Delete:** Jika relasi dipaksa `CASCADE`, PostgreSQL akan **menghapus produk/alamat tersebut beserta seluruh riwayat pesanan pembeli tadi!** Laporan omzet toko, invoice customer, dan pembukuan akuntansi mendadak hilang dan rusak.
3. **Audit & Retur Barang Gagal:** Saat pembeli ingin mengajukan retur atau komplain, data produk/alamat pada invoice sudah musnah dari database.

---

## 3. Filosofi & Logika Soft Delete di Seluruh Sistem

Prinsip kerja Soft Delete yang diterapkan di project ini:
1. **Database Tetap Utuh:** Tidak ada pemanggilan SQL `DELETE FROM` untuk data bisnis utama. Aksi "hapus" oleh admin atau user diubah menjadi:
   ```sql
   UPDATE table SET deleted_at = NOW() WHERE id = :id;
   ```
2. **Penyaringan di API & Frontend:**
   - **Tampilkan jika:** `deleted_at IS NULL` (data aktif).
   - **Sembunyikan jika:** `deleted_at IS NOT NULL` (data sudah dihapus).
   - Di sisi Frontend / UI: Data langsung hilang seketika seolah-olah berhasil dihapus, memberikan UX yang mulus tanpa memblokir pengguna.
   - Di sisi Database: Data tetap ada selamanya sehingga laporan keuangan, faktur lama, dan relasi transaksi masa lalu tidak pernah terputus.

---

## 4. Matriks Keputusan: Kapan Pakai Soft vs Hard Delete di Project Ini?

| Entitas Tabel | Metode yang Diterapkan | Alasan Teknis & Bisnis |
|:---|:---:|:---|
| **`products`** | **Soft Delete** | Terikat ke riwayat transaksi belanja pembeli (`order_items`). Jika produk dihapus, cukup set `deleted_at = NOW()`. |
| **`product_variants`** | **Soft Delete** | Varian ukuran/stok terikat ke pesanan lama. Saat varian/produk dihapus, varian ditandai `deleted_at = NOW()`. |
| **`categories`** | **Soft Delete** | Kategori terikat ke produk. Kategori yang dihapus tidak boleh menghapus produk lama secara fisik. |
| **`addresses`** | **Soft Delete** | Pengguna bebas menghapus alamat dari buku alamat (hilang di UI frontend), sementara riwayat transaksi belanja masa lalu di tabel `orders` tetap aman. |
| **`users`** | **Soft Delete** | Kebutuhan audit hukum, riwayat pesanan, dan kepatuhan data. |
| **`orders`** | **Status Change** (Bukan Delete) | Pesanan batal cukup ganti status `status = 'cancelled'`. Data keuangan tidak boleh dihapus. |
| **`cart_items`** | **Hard Delete** | Keranjang belanja adalah data sementara (*transient*). Item yang dibuang atau di-clear saat checkout wajib dihapus fisik agar tidak memicu *table bloat*. |
| **`refresh_tokens`** | **Hard Delete** | Token JWT yang sudah logout / kadaluwarsa wajib dihapus permanen demi keamanan dan performa query auth. |
| **`wishlists`** | **Hard Delete** | Saat user menekan tombol unlike/unwishlist, baris relasi dilepas permanen dari database. |

---

## 5. Implementasi Nyata di Codebase Project Ini

### A. Kolom & Indeks di Skema Prisma ([`backend/prisma/schema.prisma`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma))

Kolom `deleted_at` beserta B-Tree Index telah dipasang pada semua entitas terkait:

1. **Tabel `products`:**
   ```prisma
   model products {
     id          Int       @id @default(autoincrement())
     ...
     deleted_at  DateTime? @db.Timestamp(6)
     category_id Int

     @@index([deleted_at])
     @@index([category_id, deleted_at])
   }
   ```

2. **Tabel `product_variants`:**
   ```prisma
   model product_variants {
     id         Int       @id @default(autoincrement())
     product_id Int
     size       String    @db.VarChar
     stock      Int       @default(0)
     deleted_at DateTime? @db.Timestamp(6)

     @@index([product_id])
     @@index([deleted_at])
   }
   ```

3. **Tabel `categories`:**
   ```prisma
   model categories {
     id         Int       @id @default(autoincrement())
     name       String    @db.VarChar
     slug       String    @unique @db.VarChar
     parent_id  Int?
     deleted_at DateTime? @db.Timestamp(6)

     @@index([parent_id])
     @@index([deleted_at])
   }
   ```

4. **Tabel `addresses`:**
   ```prisma
   model addresses {
     id         Int       @id @default(autoincrement())
     user_id    Int
     ...
     deleted_at DateTime? @db.Timestamp(6)

     @@index([user_id])
     @@index([deleted_at])
   }
   ```

---

### B. Soft Delete Alamat Pengiriman ([`address.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/address/address.model.ts#L62-L73))

Pengguna bebas menghapus alamat dari buku alamat mereka kapan saja tanpa batasan:

```typescript
static async deleteAddress(addressId: number | string, userId: number): Promise<any> {
  const existing = await prisma.addresses.findFirst({
    where: { id: Number(addressId), user_id: userId, deleted_at: null },
  });
  if (!existing) return null;

  // Soft delete: tandai deleted_at agar hilang dari UI pembeli namun riwayat order tetap utuh
  return await prisma.addresses.update({
    where: { id: Number(addressId) },
    data: { deleted_at: new Date() },
  });
}
```

* **Penyaringan di API/Frontend:**
  Saat mengambil daftar alamat pengguna (`getAddressesByUserId`), query otomatis menyaring:
  ```typescript
  where: { user_id: userId, deleted_at: null }
  ```
  Alamat yang sudah dihapus langsung hilang dari layar pembeli di frontend. Namun di database, record fisik alamat tersebut tetap ada sehingga relasi `orders.address_id` tidak pernah rusak atau error Foreign Key!

---

### C. Soft Delete Kategori ([`category.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/category/category.model.ts#L41-L71))

1. **Penghapusan Kategori:**
   ```typescript
   static async deleteCategories(id: number | string): Promise<any> {
     return await prisma.categories.update({
       where: { id: Number(id) },
       data: { deleted_at: new Date() },
       select: { id: true },
     });
   }
   ```
2. **Penyaringan Kategori Aktif:**
   ```typescript
   static async getAllCategories(): Promise<CategoryResponse[]> {
     return await prisma.categories.findMany({
       where: { deleted_at: null },
       orderBy: { id: "asc" },
       ...
     });
   }
   ```

---

### D. Soft Delete Terpadu pada Produk & Varian ([`product.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts#L176-L193) & [`product.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.service.ts#L79-L89))

Saat admin menghapus sebuah produk:
1. Baik produk maupun seluruh varian ukurannya di-update menjadi `deleted_at = NOW()` di dalam satu transaksi atomik.
2. Query katalog, pencarian, detail produk, dan pemesanan hanya memuat data dengan `deleted_at IS NULL`.

```typescript
// Di product.service.ts
static async deleteProduct(productId: number | string): Promise<boolean> {
  await prisma.$transaction(async (tx) => {
    // 1. Soft delete seluruh varian milik produk ini
    await ProductModel.deleteVariants(tx, productId);
    // 2. Soft delete produk itu sendiri
    const deletedProduct = await ProductModel.deleteProduct(tx, productId);
    if (!deletedProduct) throw new AppError("Product not found", 404);
  });
  return true;
}

// Di product.model.ts
static async deleteVariants(tx: any, productId: number | string): Promise<void> {
  const db = tx || prisma;
  await db.product_variants.updateMany({
    where: { product_id: Number(productId), deleted_at: null },
    data: { deleted_at: new Date() },
  });
}
```

* **Penyaringan Otomatis pada Relasi Varian ([`product.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts#L123-L138)):**
  ```typescript
  static async getProductById(id: number | string): Promise<ProductResponse | null> {
    const p = await prisma.products.findFirst({
      where: { id: Number(id), deleted_at: null },
      include: {
        product_variants: {
          where: { deleted_at: null }, // Varian yang di-soft delete tidak ikut tampil
          select: { id: true, size: true, stock: true },
        },
      },
    });
    ...
  }
  ```

---

### E. Pencegahan Checkout & Cart untuk Item Terhapus

1. **Validasi Keranjang Belanja ([`cart.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/cart/cart.model.ts#L108-L119)):**
   ```typescript
   static async checkVariantStock(tx: any, variantId: number): Promise<any> {
     const db = tx || prisma;
     return await db.product_variants.findFirst({
       where: { id: Number(variantId), deleted_at: null },
       select: { id: true, product_id: true, size: true, stock: true },
     });
   }
   ```
2. **Validasi Checkout Order ([`order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L42-L48)):**
   ```typescript
   const variants = await tx.product_variants.findMany({
     where: { id: { in: variantIds }, deleted_at: null },
     select: { id: true, product_id: true, size: true, stock: true },
   });
   ```
   Jika varian atau produk telah di-soft delete saat pembeli mencoba checkout, sistem langsung menolak pesanan dengan aman.

---

## 6. Rangkuman Best Practice

1. **Gunakan Kolom `deleted_at DateTime?`:** Memberikan info ganda (apakah terhapus + kapan tepatnya dihapus untuk kebutuhan audit log).
2. **Pasang Indeks pada `deleted_at`:** Selalu sertakan `@@index([deleted_at])` atau indeks komposit `@@index([category_id, deleted_at])` agar filter `WHERE deleted_at IS NULL` tetap berkecepatan B-Tree instan.
3. **Penyaringan Konsisten (Filter `deleted_at IS NULL`):** Frontend dan API hanya perlu memeriksa apakah `deleted_at` bernilai `null` untuk menampilkannya ke layar.
4. **Hard Delete Hanya untuk Data Sementara:** Terapkan pembersihan fisik hanya untuk keranjang belanja (`cart_items`) dan token otentikasi kadaluwarsa (`refresh_tokens`).

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Produk, varian, kategori, dan alamat menggunakan *Pure Soft Delete* (`deleted_at DateTime?`) berindeks B-Tree, melindungi integritas relasi pesanan masa lalu dari *Foreign Key Cascade Delete*.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Prisma Client Extension for Transparent Soft Delete (`$extends`):**  
   Saat ini filter `deleted_at: null` ditulis secara manual di setiap method query model. Batasan mentoknya adalah mengonfigurasi *Prisma Client Extension* yang secara otomatis mencegat dan menyuntikkan filter `where: { deleted_at: null }` ke seluruh kueri pembacaan produk secara transparan (*Zero-Boilerplate Soft Delete*), serta mengubah `prisma.products.delete()` menjadi mutasi `update({ data: { deleted_at: new Date() } })`.
2. **Cold Table Partitioning / Archival Worker (> 2 Tahun):**  
   Data yang di-soft delete bertahun-tahun lalu tetap memakan kapasitas tabel utama. Batasan mentok DBA adalah memindahkan record dengan `deleted_at < NOW() - INTERVAL '2 years'` ke tabel arsip dingin terpisah (`products_history_archive`) agar ukuran tabel operasional utama tetap ramping.

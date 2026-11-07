# 13. Soft Delete vs Hard Delete Implementation Guide

Dokumen ini membedah perbedaan mendasar antara **Soft Delete** dan **Hard Delete**, bahaya fatal jika salah menerapkannya di e-commerce, matriks keputusan per entitas tabel, serta **implementasi nyata dan proteksi data di codebase project Nexa Streetwear**.

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

Bayangkan toko streetwear Anda pernah menjual jaket *"Alpha Hoodie"* (ID: 10) kepada 50 pembeli bulan lalu. Riwayat pesanan mereka tersimpan di tabel `order_items` dengan `product_id = 10`.

Jika admin toko menghapus jaket itu menggunakan **Hard Delete**:
1. **Error Foreign Key Restrict:** PostgreSQL akan menolak penghapusan karena ID 10 masih terikat ke tabel `order_items`, memicu error sistem 500.
2. **Bencana Cascade Delete:** Jika relasi dipaksa `CASCADE`, PostgreSQL akan **menghapus jaket itu beserta 50 riwayat pesanan pembeli tadi!** Laporan omzet toko, invoice customer, dan pembukuan akuntansi mendadak hilang dan rusak.
3. **Audit & Retur Barang Gagal:** Saat pembeli ingin mengajukan retur atau komplain, data produk pada invoice sudah tidak ditemukan.

> **Aturan Emas:** Data master (Produk, Pengguna, Pesanan) **WAJIB menggunakan Soft Delete**. Hard delete hanya diperbolehkan untuk data sementara (*transient data*).

---

## 3. Matriks Keputusan: Kapan Pakai Soft vs Hard Delete di Project Ini?

| Entitas Tabel | Metode yang Diterapkan | Alasan Teknis & Bisnis |
|:---|:---:|:---|
| **`products`** | **Soft Delete** | Terikat ke riwayat transaksi belanja pembeli (`order_items`). |
| **`users`** | **Soft Delete** | Kebutuhan audit hukum, kepatuhan GDPR, dan riwayat pesanan. |
| **`orders`** | **Status Change** (Bukan Delete) | Pesanan batal cukup ganti status `status = 'cancelled'`. Data keuangan tidak boleh dihapus. |
| **`addresses`** | **Conditional Hard Delete** | Alamat hanya boleh di-hard delete jika **belum pernah dipakai transaksi**. Jika sudah pernah dipakai order, sistem memproteksi integritasnya. |
| **`cart_items`** | **Hard Delete** | Keranjang belanja adalah data sementara (*transient*). Item yang dibuang atau di-clear saat checkout wajib dihapus fisik agar tidak memicu *table bloat*. |
| **`refresh_tokens`** | **Hard Delete** | Token JWT yang sudah logout / kadaluwarsa wajib dihapus permanen demi keamanan dan performa query auth. |
| **`wishlists`** | **Hard Delete** | Saat user menekan tombol unlike/unwishlist, baris relasi dilepas permanen dari database. |

---

## 4. Implementasi Nyata di Codebase Project Ini

### A. Kolom & Indeks di Skema Prisma ([`backend/prisma/schema.prisma`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma#L143-L158))
Tabel `products` dilengkapi kolom `deleted_at` dan indeks performa khusus:

```prisma
model products {
  id               Int                @id @default(autoincrement())
  ...
  deleted_at       DateTime?          // Kolom penanda soft delete
  category_id      Int

  @@index([deleted_at])              // Indeks untuk filter cepat
  @@index([category_id, deleted_at]) // Indeks komposit katalog aktif
}
```

---

### B. Soft Delete Murni di Service & Model Produk

1. **Model Soft Delete di [`backend/src/modules/product/product.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts#L176-L185):**
   ```typescript
   static async deleteProduct(tx: any, productId: number | string): Promise<any> {
     const db = tx || prisma;
     return await db.products.update({
       where: { id: Number(productId) },
       data: {
         deleted_at: new Date(), // Stempel waktu saat ini
       },
       select: { id: true },
     });
   }
   ```

2. **Integritas Varian Terjaga di [`backend/src/modules/product/product.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.service.ts#L79-L87):**
   ```typescript
   static async deleteProduct(productId: number | string): Promise<boolean> {
     // Soft delete murni: tidak menghapus varian fisik agar invoice order masa lalu tetap valid
     const deletedProduct = await ProductModel.deleteProduct(null, productId);
     if (!deletedProduct) {
       throw new AppError("Product not found", 404);
     }
     return true;
   }
   ```

---

### C. Proteksi Filter di Seluruh Query Katalog

Seluruh query pengambilan produk secara otomatis mengabaikan produk yang sudah di-soft delete:

1. **Katalog & Pagination di [`product.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts#L50-L65):**
   ```typescript
   where: { deleted_at: null } // Hanya tampilkan produk aktif
   ```

2. **Detail Produk by ID & Slug di [`product.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts#L123-L138):**
   ```typescript
   static async getProductById(id: number | string): Promise<ProductResponse | null> {
     return await prisma.products.findFirst({
       where: { id: Number(id), deleted_at: null }, // Mencegah akses ke produk terhapus
       ...
     });
   }

   static async getProductBySlug(slug: string): Promise<ProductResponse | null> {
     return await prisma.products.findFirst({
       where: { slug, deleted_at: null }, // Return 404 jika produk sudah diarsipkan
       ...
     });
   }
   ```

---

### D. Proteksi Integritas Alamat Pengiriman di [`backend/src/modules/address/address.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/address/address.service.ts#L29-L43)

Untuk mencegah error *Foreign Key Restrict* saat pembeli menghapus alamat:
```typescript
static async deleteAddress(addressId: number | string, userId: number): Promise<boolean> {
  const existingAddress = await AddressModel.getAddressByIdAndUserId(addressId, userId);
  if (!existingAddress) {
    throw new AppError("Address not found", 404);
  }

  // Cek apakah alamat ini pernah dipakai untuk transaksi checkout pesanan
  const orderUsingAddress = await prisma.orders.findFirst({
    where: { address_id: Number(addressId) },
    select: { id: true },
  });

  if (orderUsingAddress) {
    throw new AppError("Alamat tidak dapat dihapus karena terikat dengan riwayat pesanan yang sudah ada.", 400);
  }

  // Jika belum pernah dipakai belanja, aman di-hard delete fisik
  await AddressModel.deleteAddress(addressId, userId);
  return true;
}
```

---

## 5. Rangkuman Best Practice

1. **Gunakan Kolom `deleted_at DateTime?`:** Memberikan info ganda (apakah terhapus + kapan tepatnya dihapus untuk kebutuhan audit log).
2. **Pasang Indeks pada `deleted_at`:** Selalu sertakan `@@index([deleted_at])` atau indeks komposit `@@index([category_id, deleted_at])` agar filter `WHERE deleted_at IS NULL` tetap instan.
3. **Jangan Hapus Anak Relasi saat Soft Delete Induk:** Membiarkan varian fisik tetap ada di database memastikan histori transaksi masa lalu tetap valid.
4. **Hard Delete Hanya untuk Data Sementara:** Terapkan pembersihan fisik untuk keranjang belanja (`cart_items`) dan token otentikasi kadaluwarsa (`refresh_tokens`).

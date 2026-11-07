# 05. N+1 Query Problem

## 1. Masalah yang Terjadi
**N+1 Query Problem** adalah salah satu *anti-pattern* performa paling umum pada aplikasi database:
Aplikasi mengeksekusi **1 query awal** untuk mengambil sekumpulan data induk (*parent*), lalu di dalam loop aplikasi menjalankan **N query tambahan** untuk mengambil data anak (*child*) masing-masing.

Contoh kasus nyata saat checkout:
```typescript
// ANTI-PATTERN (N+1 Queries):
const cartItems = [...] // Ada 50 barang di keranjang belanja
for (const item of cartItems) {
  // Query ini ditembak 50 KALI ke database!
  const variant = await db.product_variants.findUnique({
    where: { id: item.product_variant_id }
  });
}
```
**Akibatnya:**
* Jika ada 50 barang $\to$ 1 query cart + 50 query varian = **51 roundtrip ke database**.
* Latensi jaringan melonjak drastis (dari 5ms menjadi 500ms+).
* Database mengalami lonjakan beban I/O (*connection contention*) hanya untuk melayani 1 user.

---

## 2. Solusi Best Practice
1. **Batch Fetching (`WHERE IN (...)`):**
   * Mengumpulkan seluruh ID yang dibutuhkan dalam 1 array, lalu meminta seluruh data anak dalam **1 kali query saja** menggunakan klausa `IN`.
   * Di memori backend, data dipetakan menggunakan struktur data `Map` dengan kompleksitas pencarian $O(1)$.
2. **Eager Loading via ORM (`include` / `JOIN`):**
   * Menginstruksikan ORM untuk melakukan `JOIN` atau batch select di balik layar secara otomatis.
3. **Recursive CTE (Common Table Expression):**
   * Untuk data berstruktur pohon hirarkis (seperti Kategori $\to$ Subkategori), gunakan CTE rekursif di level mesin database daripada melakukan query berulang dari aplikasi.

---

## 3. Implementasi di Project Ini

Di project ini, N+1 Query Problem telah dieliminasi di berbagai modul penting:

### A. Batch Fetching Varian Produk Saat Checkout
Diterapkan di [`backend/src/modules/order/order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L39-L53):
```typescript
// 1. Kumpulkan seluruh ID varian dalam 1 array
const variantIds = sortedCartItems.map((item) => item.product_variant_id);

// 2. Ambil SEMUA varian sekaligus dalam 1 query batch (WHERE id IN (...))
const variants = await tx.product_variants.findMany({
  where: { id: { in: variantIds } },
  select: { id: true, product_id: true, size: true, stock: true },
});

// 3. Petakan ke dalam Map untuk lookup instan O(1) di dalam memori
const variantMap = new Map(variants.map((v) => [v.id, v]));

// 4. Looping sekarang 100% di memori, TANPA query tambahan ke database
for (const item of sortedCartItems) {
  const variant = variantMap.get(item.product_variant_id);
  if (!variant || variant.stock < item.quantity) {
    throw new AppError("Cart is empty or stock is insufficient", 400);
  }
}
```

### B. Batch Fetching Hirarki Kategori
Diterapkan di [`backend/src/modules/product/product.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.service.ts#L98-L103):
Saat menangani URL slug bersarang seperti `/categories/shoes/sneakers/running`, semua kandidat kategori diambil sekaligus menggunakan `where: { slug: { in: slugPathArray } }` alih-alih mengecek satu per satu per segmen URL.

### C. Recursive CTE untuk Breadcrumbs Kategori
Diterapkan di [`backend/src/modules/product/product.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.service.ts#L146-L157):
Mengambil seluruh silsilah induk kategori dari level terbawah hingga *root* parent hanya dalam **1 kali roundtrip SQL** menggunakan `WITH RECURSIVE category_tree AS (...)`.

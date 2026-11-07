# 03. Query Builder vs ORM

## 1. Masalah yang Terjadi
Pada aplikasi backend berbasis Node.js/TypeScript:
* **Raw SQL Hardcoded:** Menulis query mentah (`"SELECT id, name FROM prducts WHERE id = ..."`) sangat rentan terhadap *typo* nama tabel/kolom yang baru disadari saat kode dijalankan (*runtime error*).
* **Ketiadaan Type-Safety:** Menggunakan driver database murni mengembalikan data bertipe `any`. Developer tidak mendapat fitur *auto-completion / IntelliSense* di editor kode dan rentan mengakses properti yang tidak ada (`product.prce` alih-alih `product.price`).
* **Maintenance Relasi Rumit:** Melakukan join manual antar tabel (`products` $\to$ `product_variants` $\to$ `categories`) membutuhkan penulisan query panjang yang sulit dirawat.

---

## 2. Solusi Best Practice
Memilih pendekatan yang tepat antara **Raw SQL**, **Query Builder**, dan **ORM**:

| Pendekatan | Contoh Tool | Kelebihan | Kekurangan |
|:---|:---|:---|:---|
| **Raw SQL** | `pg` / `mysql2` | Performa maksimal, kontrol penuh atas query SQL. | Rawan typo, tanpa type-safety bawaan, rawan SQL Injection jika concat manual. |
| **Query Builder** | Knex.js / Kysely | Fleksibel, menyusun query secara modular via fungsi JavaScript. | Tetap butuh definisi tipe manual, migrasi skema terpisah. |
| **Modern ORM** | Prisma / Drizzle | **100% Type-Safe**, auto-generate TypeScript types dari schema, manajemen relasi elegan, validasi compile-time. | Sedikit overhead memori untuk query yang sangat kompleks (bisa diatasi dengan raw query terukur). |

---

## 3. Implementasi di Project Ini

Project ini menerapkan pendekatan **Hybrid: Prisma ORM sebagai layer utama + Type-Safe Raw Query untuk query recursive kompleks**.

### A. Type-Safe Query Building via Prisma Client
Sebagian besar query bisnis di project ini menggunakan Prisma Client yang menjamin seluruh input dan output memiliki tipe data statis.

Contoh di [`backend/src/modules/product/product.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts):
```typescript
const products = await prisma.products.findMany({
  where: {
    category_id: categoryId,
    deleted_at: null, // Soft delete filter
  },
  include: {
    product_variants: {
      select: { id: true, size: true, stock: true },
    },
  },
  take: limit,
  skip: offset,
});
```
* Kompiler TypeScript langsung memeriksa apakah kolom `category_id` dan relasi `product_variants` valid sesuai skema database.

### B. Fallback ke Type-Safe Raw Query untuk CTE Rekursif
Untuk kebutuhan khusus seperti mengambil seluruh pohon hirarki kategori (Parent $\to$ Child $\to$ Grandchild), Prisma mendukung tagged template literal `$queryRaw` yang tetap aman dan terstruktur.

Contoh di [`backend/src/modules/product/product.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.service.ts#L146-L155):
```typescript
const hierarchyResult = await prisma.$queryRaw<CategoryHierarchy[]>`
  WITH RECURSIVE category_tree AS (
     SELECT id, name, slug, parent_id FROM categories WHERE id = ${category.id}
     UNION ALL
     SELECT c.id, c.name, c.slug, c.parent_id 
     FROM categories c
     INNER JOIN category_tree ct ON ct.parent_id = c.id
   )
   SELECT id, name, slug, parent_id FROM category_tree;
`;
```
Query ini menggabungkan fleksibilitas SQL Recursive Common Table Expression (CTE) dengan parameter sanitasi otomatis dan tipe data kembalian yang jelas.

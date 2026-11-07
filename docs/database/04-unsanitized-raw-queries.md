# 04. Unsanitized Raw Queries (SQL Injection)

## 1. Masalah yang Terjadi
SQL Injection adalah celah keamanan kritikal (OWASP Top 10) yang terjadi ketika input dari pengguna (*user input*) langsung digabungkan ke dalam string query SQL tanpa proses sanitasi (*string concatenation*).

Contoh kode berbahaya:
```typescript
// SANGAT BERBAHAYA (SQL INJECTION VULNERABLE):
const email = req.body.email; // Misal attacker menginput: "' OR '1'='1"
const query = `SELECT * FROM users WHERE email = '${email}';`;
await db.query(query);
```
Akibatnya:
* Penyerang bisa melewati sistem login (*authentication bypass*).
* Penyerang bisa mengekstraksi data sensitif pelanggan (password hash, kartu pembayaran).
* Penyerang bisa menjalankan perintah destruktif seperti `DROP TABLE users;--`.

---

## 2. Solusi Best Practice
1. **Parameterized Queries / Prepared Statements:**
   * Jangan pernah menggabungkan variabel string ke dalam SQL. Gunakan placeholder parameter (seperti `$1, $2` di PostgreSQL). Mesin database akan memperlakukan nilai tersebut murni sebagai data literal, bukan perintah yang bisa dieksekusi.
2. **Penggunaan ORM Teruji:**
   * ORM modern secara bawaan menyusun parameterized query untuk seluruh operasi CRUD.
3. **Validasi Input Ketat di Pintu Masuk:**
   * Gunakan skema validasi seperti **Zod** untuk memastikan data yang masuk sesuai tipe (angka, string berkarakter aman, format email valid) sebelum menyentuh layer database.

---

## 3. Implementasi di Project Ini

Project ini menerapkan perlindungan berlapis terhadap SQL Injection:

### A. Parameterized Prisma Engine
Semua query berbasis Prisma otomatis di-parameterize di level binary engine. Nilai input dari controller diperlakukan sebagai nilai variabel terisolasi:
```typescript
// Aman secara default:
await prisma.users.findUnique({
  where: { email: cleanEmail },
});
```

### B. Tagged Template Literal pada `$queryRaw`
Saat query raw SQL dibutuhkan, project ini tidak menggunakan string biasa, melainkan tagged template literal ``prisma.$queryRaw`...` ``.

Contoh di [`backend/src/modules/product/product.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.service.ts#L146-L155):
```typescript
// AMAN: Nilai ${category.id} otomatis diubah Prisma menjadi parameter $1 di PostgreSQL
const hierarchyResult = await prisma.$queryRaw<any[]>`
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

### C. Safe Transaction Wrapper di [`backend/src/config/db.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/db.ts#L26-L41)
Pada layer low-level PostgreSQL driver (`pg`), query dieksekusi melalui client yang mendukung parameter array:
```typescript
// Menggunakan array parameter untuk keamanan raw client:
await client.query("SELECT * FROM products WHERE id = $1", [productId]);
```

### D. Validasi Skema via Zod
Setiap request payload diverifikasi oleh Zod validator di layer middleware sebelum diproses oleh controller/service, menyaring input berbahaya sejak awal.

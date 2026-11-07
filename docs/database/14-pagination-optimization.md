# 14. Pagination Optimization: Offset, Cursor, & Hybrid Architecture

Dokumen ini membedah arsitektur dan optimasi sistem pagination pada database PostgreSQL di project **Nexa Streetwear E-Commerce**, mulai dari jebakan performa pagination tradisional (*The OFFSET Trap*), keunggulan *Keyset / Cursor-based Pagination*, hingga penerapan **Hybrid Pagination** yang fleksibel bagi Storefront Pembeli dan Dashboard Admin.

---

## 1. Mengapa Pagination Butuh Dioptimasi?

Pada e-commerce dengan ribuan hingga jutaan SKU produk, mengambil seluruh data sekaligus (`SELECT * FROM products`) adalah bencana:
1. **Memory Exhaustion (OOM):** Server Node.js kehabisan RAM karena mem-parsing jutaan objek JSON.
2. **Network Saturation:** Transfer data puluhan megabyte membuat aplikasi lambat di sisi klien.
3. **Browser Crash:** Klien/HP pengguna akan *freeze* saat merender ribuan elemen DOM sekaligus.

Namun, membuat pagination dengan cara biasa (`OFFSET` dan `LIMIT`) menyimpan jebakan performa tersembunyi yang sangat fatal.

---

## 2. Masalah Utama Pagination Tradisional: "The OFFSET Trap"

Sebagian besar implementasi awal menggunakan query seperti:
```sql
SELECT id, name, price, img_url 
FROM products 
WHERE deleted_at IS NULL 
ORDER BY id ASC 
LIMIT 10 OFFSET 100000;
```
*(Maksud query: Ambil 10 produk di halaman 10.001)*

### A. Beban I/O & CPU yang Membengkak
Database **tidak bisa langsung melompat** ke baris ke-100.001. 
* PostgreSQL terpaksa **membaca 100.010 baris data dari disk ke RAM**,
* Menghitung urutan barisnya,
* **Membuang 100.000 baris pertama**,
* Dan hanya menyerahkan 10 baris terakhir ke aplikasi.

| Halaman | Parameter SQL | Estimasi Waktu Eksekusi | Beban Database |
|:---|:---|:---:|:---|
| **Halaman 1** | `LIMIT 10 OFFSET 0` | **~1 - 2 ms** | Sangat Ringan |
| **Halaman 50** | `LIMIT 10 OFFSET 500` | **~5 ms** | Ringan |
| **Halaman 1.000** | `LIMIT 10 OFFSET 10000` | **~85 ms** | Mulai Membengkak |
| **Halaman 10.000** | `LIMIT 10 OFFSET 100000` | **~1.500 - 4.000 ms (4 detik!)** | CPU Spike 100% |

Semakin jauh pengguna mengklik nomor halaman (*Deep Paging*), server database akan semakin lambat dan bisa memicu *Connection Pool Exhaustion*.

### B. Masalah "Data Drift" (Barang Dobel / Terlewat)
Jika pembeli sedang melihat halaman 1, lalu admin memasukkan 1 produk baru:
* Produk baru tersebut menempati urutan teratas.
* Saat pembeli mengklik "Halaman 2", produk terakhir dari halaman 1 akan terdorong ke halaman 2.
* **Akibatnya:** Pembeli melihat barang yang sama dua kali. Sebaliknya jika ada produk yang dihapus, ada barang yang **terlewat tanpa pernah terlihat**.

---

## 3. Solusi Modern: Keyset / Cursor-Based Pagination

Alih-alih menyuruh database *"baca lalu buang 100.000 baris"*, kita memberikan **kursor** (penanda nilai unik terakhir yang sedang dilihat pengguna, misalnya `id` terakhir).

Perintah SQL berubah menjadi:
```sql
-- Halaman 1 (Belum ada kursor):
SELECT id, name, price, img_url 
FROM products 
WHERE deleted_at IS NULL 
ORDER BY id ASC 
LIMIT 10;
-- Hasil: Baris ke-10 memiliki id = 42

-- Halaman 2 (Frontend mengirim cursor = 42):
SELECT id, name, price, img_url 
FROM products 
WHERE deleted_at IS NULL AND id > 42 
ORDER BY id ASC 
LIMIT 10;
```

### Mengapa Cursor-Based Pagination Selalu Cepat ($O(1)$)?
PostgreSQL tidak perlu men-scan data sebelumnya. Dengan adanya **B-Tree Index pada kolom `id`**, database langsung melompat ke angka `43` secara instan (*Index Seek*). Kecepatan query di halaman ke-1 atau ke-100.000 **selalu konstan di kisaran ~1 milidetik**.

---

## 4. Matriks Perbandingan: Offset vs Cursor

| Karakteristik | Offset-Based (`?page=X`) | Cursor-Based (`?cursor=X`) |
|:---|:---|:---|
| **Kompleksitas Waktu** | $O(N)$ — Makin jauh halaman makin lemot | $O(1)$ — Kecepatan selalu konstan dan instan |
| **Navigasi Layar** | Bisa loncat langsung ke halaman tertentu (misal Hal 5) | Hanya bisa *Next* atau *Previous* |
| **Konsistensi Data** | Rawan duplikasi / data terlewat saat ada insert/delete | 100% konsisten (bebas *data drift*) |
| **Hitung Total Halaman** | Membutuhkan `COUNT(*)` (mahal di data jutaan) | Tidak butuh `COUNT(*)`, cukup cek token `nextCursor` |
| **UX Paling Cocok** | Tabel Admin Dashboard, Pencarian Desktop | Infinite Scroll, Tombol "Load More", Aplikasi Mobile |

---

## 5. Arsitektur Hybrid Pagination di Nexa Streetwear

Project Nexa menerapkan **Hybrid Pagination** yang menggabungkan keunggulan kedua metode:
1. **Storefront Pembeli:** Menggunakan **Cursor Pagination** untuk navigasi *Infinite Scroll* atau *Load More* yang mulus dan bebas lag di smartphone.
2. **Admin Dashboard & Desktop:** Mendukung **Offset Pagination** (`?page=X`) agar pengguna desktop atau admin tetap bisa melompat langsung ke nomor halaman tertentu.

---

## 6. Implementasi Nyata di Codebase Project Ini

### A. Deteksi Otomatis di Controller ([`product.controller.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.controller.ts#L40-L73))

Controller secara cerdas mendeteksi parameter yang dikirim oleh Frontend:

```typescript
static async getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    // 1. JIKA FRONTEND MENGIRIM KURSOR -> GUNAKAN CURSOR-BASED PAGINATION
    if (cursor !== undefined || req.query.cursor === "" || search !== undefined) {
      const feed = await ProductServices.getProductFeed(limit, cursor, search);
      return res.status(200).json({
        status: "success",
        message: "Success fetch product feed (cursor)",
        payload: feed.products,
        pagination: {
          limit,
          nextCursor: feed.nextCursor,
          hasMore: feed.nextCursor !== null,
        },
      });
    }

    // 2. JIKA FRONTEND MENGIRIM PAGE -> GUNAKAN OFFSET-BASED PAGINATION
    const page = parseInt(req.query.page as string, 10) || 1;
    const offset = (page - 1) * limit;

    const allProduct = await ProductServices.getProduct(limit, offset);

    return res.status(200).json({
      status: "success",
      message: "Success fetch product list",
      payload: allProduct,
    });
  } catch (error) {
    next(error);
  }
}
```

---

### B. Engine Cursor di Model ([`product.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts#L78-L121))

Teknik `take: limit + 1` digunakan untuk mendeteksi apakah masih ada data di halaman selanjutnya tanpa perlu menjalankan query `COUNT(*)` yang berat:

```typescript
static async getProductsByCursor(
  limit: number = 10,
  cursor?: number,
  search?: string
): Promise<{ products: ProductResponse[]; nextCursor: number | null }> {
  const whereClause: any = { deleted_at: null };

  // Lompat langsung menggunakan B-Tree index ID
  if (cursor) {
    whereClause.id = { gt: cursor };
  }

  // Ambil 1 baris ekstra (limit + 1) sebagai 'sensor' hasMore
  const rows = await prisma.products.findMany({
    where: whereClause,
    orderBy: { id: "asc" },
    take: limit + 1,
    select: {
      id: true,
      category_id: true,
      name: true,
      slug: true,
      price: true,
      img_url: true,
      created_at: true,
    },
  });

  let nextCursor: number | null = null;
  // Jika baris yang didapat > limit, berarti masih ada halaman berikutnya
  if (rows.length > limit) {
    rows.pop(); // Buang data ke-11
    nextCursor = rows[rows.length - 1].id; // ID terakhir menjadi token kursor berikutnya
  }

  return {
    products: rows as any,
    nextCursor,
  };
}
```

---

### C. Engine Offset di Model ([`product.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts#L47-L72))

Melayani permintaan lompat nomor halaman:

```typescript
static async getAllProducts(limit = 10, offset = 0): Promise<{ products: ProductResponse[]; totalItems: number }> {
  const [products, totalItems] = await Promise.all([
    prisma.products.findMany({
      where: { deleted_at: null },
      orderBy: { id: "asc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        category_id: true,
        name: true,
        slug: true,
        price: true,
        img_url: true,
      },
    }),
    prisma.products.count({
      where: { deleted_at: null },
    }),
  ]);

  return {
    products: products as any,
    totalItems,
  };
}
```

---

## 7. Format Kontrak API untuk Tim Frontend

### Mode A: Infinite Scroll / Load More (Cursor)
* **Request Halaman 1:**
  `GET /api/v1/products?limit=10&cursor=`
* **Response:**
  ```json
  {
    "status": "success",
    "message": "Success fetch product feed (cursor)",
    "payload": [ ...10 item produk... ],
    "pagination": {
      "limit": 10,
      "nextCursor": 45,
      "hasMore": true
    }
  }
  ```
* **Request Halaman 2 (Load More):**
  Frontend cukup menyematkan `cursor=45`:
  `GET /api/v1/products?limit=10&cursor=45`

---

### Mode B: Lompat Nomor Halaman (Offset)
* **Request:**
  `GET /api/v1/products?limit=10&page=3`
* **Response:**
  ```json
  {
    "status": "success",
    "message": "Success fetch product list",
    "payload": {
      "products": [ ...10 item produk halaman 3... ],
      "totalItems": 150
    }
  }
  ```

---

## 8. Trik Optimasi Lanjutan Standar Industri

Jika toko online ingin tetap mempertahankan tombol lompat halaman di desktop dengan performa maksimal, terapkan dua strategi berikut:

### 1. Pembatasan Kedalaman Halaman (*Deep Paging Cap*)
Batasi halaman yang bisa diakses pengguna hingga maksimum halaman 50 atau 100. Jika pembeli belum menemukan produk setelah 50 halaman, dorong pengguna untuk menggunakan **Filter Kategori** atau **Kolom Pencarian**.

### 2. Optimasi *Deferred Join*
Untuk query offset yang jauh, hindari membaca data teks/gambar di awal. Gunakan subquery indeks ID terlebih dahulu:
```sql
SELECT p.id, p.name, p.price, p.img_url 
FROM products p
JOIN (
  SELECT id FROM products 
  WHERE deleted_at IS NULL 
  ORDER BY id ASC 
  LIMIT 10 OFFSET 50000
) AS sub ON p.id = sub.id;
```
Subquery hanya membaca indeks angka `id` di memory B-Tree, lalu melakukan *join* hanya untuk 10 baris terpilih, menghemat I/O disk hingga 90%.

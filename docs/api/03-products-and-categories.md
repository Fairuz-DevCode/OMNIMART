# 03. Products & Categories API

Modul ini menyediakan endpoint katalog produk streetwear, pencarian cepat berbasis Full-Text Search (GIN Trigram), hierarki kategori pakaian, varian warna/ukuran, serta manajemen upload gambar WebP via Sharp.

---

## 1. Ambil Katalog Produk (Kueri, Filter & Pencarian)
Mengambil daftar produk dengan dukungan pencarian teks toleran salah ketik (*typo-tolerant trigram*), filter harga, kategori, serta pagination hybrid (Cursor & Offset).

* **Method:** `GET`
* **URL:** `/api/products`
* **Auth:** Publik
* **Cache:** Di-cache di Redis selama 10 menit (otomatis dilewati jika ada query `search` atau `cursor` dinamis).

### Query Parameters:
| Parameter | Tipe | Contoh | Keterangan |
|:---|:---:|:---|:---|
| `search` | String | `hoodie cyber` | Pencarian teks bebas menggunakan GIN Trigram FTS. |
| `category` | String / Int | `hoodies` | Filter berdasarkan slug atau ID kategori. |
| `minPrice` | Number | `200000` | Batas harga terendah. |
| `maxPrice` | Number | `800000` | Batas harga tertinggi. |
| `sort` | String | `price_asc` | `latest`, `price_asc`, `price_desc`, `popular`. |
| `cursor` | Int | `45` | Keyset Cursor ID untuk infinite scroll. |
| `page` | Int | `1` | Nomor halaman (Offset pagination). |
| `limit` | Int | `12` | Jumlah produk per respons (default 10). |

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Products retrieved successfully",
  "payload": {
    "products": [
      {
        "id": 1,
        "name": "Nexa Cyberpunk Oversized Hoodie",
        "slug": "nexa-cyberpunk-oversized-hoodie",
        "description": "Premium 400 GSM heavy cotton hoodie with futuristic graphic print.",
        "price": 499000,
        "category_id": 3,
        "category_name": "Hoodies",
        "image_url": "/uploads/products/hoodie-cyber-1.webp",
        "is_active": true,
        "variants": [
          { "id": 10, "size": "M", "color": "Black", "stock": 25 },
          { "id": 11, "size": "L", "color": "Black", "stock": 40 }
        ]
      }
    ],
    "pagination": {
      "nextCursor": 2,
      "hasNextPage": true,
      "total": 128
    }
  }
}
```

---

## 2. Ambil Detail Produk
Mengambil detail lengkap satu produk beserta varian ukuran, warna, stok, dan kategori.

* **Method:** `GET`
* **URL:** `/api/products/:id`
* **Auth:** Publik
* **Cache:** Di-cache di Redis (`600s`)

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Product detail retrieved successfully",
  "payload": {
    "id": 1,
    "name": "Nexa Cyberpunk Oversized Hoodie",
    "slug": "nexa-cyberpunk-oversized-hoodie",
    "price": 499000,
    "variants": [
      { "id": 10, "size": "M", "color": "Black", "stock": 25, "sku": "NX-HD-BLK-M" },
      { "id": 11, "size": "L", "color": "Black", "stock": 40, "sku": "NX-HD-BLK-L" }
    ],
    "category": {
      "id": 3,
      "name": "Hoodies",
      "slug": "hoodies"
    }
  }
}
```

---

## 3. Ambil Berdasarkan Path Slug Kategori Dinamis
Mengakses produk via struktur URL SEO: `/api/products/apparel/hoodies/nexa-cyberpunk-hoodie`.

* **Method:** `GET`
* **URL:** `/api/products/*slugPath`
* **Auth:** Publik

---

## 4. Tambah Produk Baru (Admin Only)
Menambahkan produk baru ke katalog dan otomatis mengonversi gambar ke format **WebP** terkompresi via Sharp.

* **Method:** `POST`
* **URL:** `/api/products`
* **Headers:** `Authorization: Bearer <adminToken>`, `Content-Type: multipart/form-data`

### Form-Data Fields:
* `name`: String (`"Nexa Tactical Cargo Pants"`)
* `description`: String
* `price`: Number (`550000`)
* `category_id`: Number (`2`)
* `image`: File gambar (`.jpg`, `.png`, `.webp` max 5MB)
* `variants`: JSON String (`[{"size":"32","color":"Army Green","stock":30}]`)

### Response Success (`201 Created`):
```json
{
  "status": "success",
  "message": "Product created successfully",
  "payload": {
    "id": 15,
    "name": "Nexa Tactical Cargo Pants",
    "slug": "nexa-tactical-cargo-pants",
    "price": 550000,
    "image_url": "/uploads/products/nexa-tactical-cargo-pants-1731400000.webp"
  }
}
```
*(Catatan: Cache katalog otomatis dibersihkan via `invalidateCache("products")`)*

---

## 5. Perbarui Produk (Admin Only)
* **Method:** `PATCH`
* **URL:** `/api/products/:id`
* **Headers:** `Authorization: Bearer <adminToken>`, `Content-Type: multipart/form-data`

---

## 6. Hapus Produk (Pure Soft Delete - Admin Only)
Menonaktifkan produk tanpa merusak riwayat transaksi atau varian pesanan lama.

* **Method:** `DELETE`
* **URL:** `/api/products/:id`
* **Headers:** `Authorization: Bearer <adminToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Product soft deleted successfully"
}
```

---

## 7. Hierarki Kategori Pakaian (Categories)

### A. Ambil Seluruh Pohon Kategori
* **Method:** `GET`
* **URL:** `/api/categories`
* **Auth:** Publik (Cache Redis 10 menit)

#### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Categories retrieved successfully",
  "payload": [
    {
      "id": 1,
      "name": "Apparel",
      "slug": "apparel",
      "children": [
        { "id": 2, "name": "T-Shirts", "slug": "t-shirts" },
        { "id": 3, "name": "Hoodies", "slug": "hoodies" }
      ]
    }
  ]
}
```

### B. Buat Kategori Baru (Admin Only)
* **Method:** `POST`
* **URL:** `/api/categories`
* **Headers:** `Authorization: Bearer <adminToken>`

#### Request Body:
```json
{
  "name": "Jackets & Outerwear",
  "parent_id": 1
}
```

### C. Hapus Kategori (Admin Only)
* **Method:** `DELETE`
* **URL:** `/api/categories/:id`
* **Headers:** `Authorization: Bearer <adminToken>`

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Katalog produk mendukung hybrid pagination (Cursor Keyset & Offset), filter harga/kategori, dan pencarian Full-Text Search PostgreSQL Trigram (`pg_trgm`).
* Cache Redis 10 menit dengan isolasi invalidasi otomatis saat ada mutasi data admin.
* Pemrosesan gambar tunggal ke format modern WebP via Sharp.
* Hierarki kategori rekursif CTE dan penghapusan produk berbasis Pure Soft Delete.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Multi-Image Product Gallery Upload (`images: Express.Multer.File[]`):**  
   Saat ini upload produk admin hanya mendukung 1 file gambar utama. Standar mentok e-commerce streetwear membutuhkan galeri 4–6 foto (tampak depan, belakang, detail sablon, dan on-model) dengan penentuan gambar primer (`is_primary`) dan urutan urut (*display_order*).
2. **Low Stock Alerting & Back-in-Stock Notification:**  
   Belum ada sistem peringatan otomatis saat stok varian menipis ke batas kritis (misal `< 5`) ke dashboard/email admin, serta belum ada fitur bagi pelanggan untuk mendaftar notifikasi *"Kabari Saya Saat Stok Tersedia"*.
3. **Product Views & Popularity Analytics Engine:**  
   Parameter sort `popular` saat ini masih belum terhubung ke counter tampilan nyata. Batasan mentoknya menggunakan Redis HyperLogLog (`PFADD product:views:<id> <user_ip>`) untuk mencatat view unik harian tanpa membebani disk database.
4. **Bulk Product Import & Export (CSV / Excel):**  
   Admin belum bisa mengunggah atau mengunduh ribuan katalog produk sekaligus via spreadsheet (`POST /api/products/bulk-import` dengan streaming parser `csv-parser` dan batch insert).

# 17. Full-Text Search Engine: Inverted Index, Elasticsearch vs PostgreSQL, & Trigram Typo-Tolerance

Dokumen ini membedah arsitektur **Full-Text Search (FTS)** pada project **Nexa Streetwear E-Commerce**, kelemahan fatal pencarian konvensional `LIKE '%...%'`, evaluasi perbandingan antara **Elasticsearch** dan **PostgreSQL Native FTS**, serta implementasi nyata sistem pencarian kebal salah ketik (*Typo-Tolerant Search*) menggunakan ekstensi **`pg_trgm`** dan **GIN (Generalized Inverted Index)** di codebase backend.

---

## 1. Masalah Besar Pencarian Konvensional: `LIKE '%kata%'`

Sebagian besar aplikasi pemula menggunakan perintah SQL:
```sql
SELECT id, name, price FROM products WHERE name ILIKE '%hoodie%';
```

Metode ini menyimpan 4 kelemahan fatal bagi toko online:
1. **Full Table Scan (Sangat Lambat di Jutaan Baris):**
   Karena diawali tanda *wildcard* `%` (`'%hoodie%'`), database **tidak bisa menggunakan B-Tree Index biasa**. Database terpaksa men-scan jutaan baris teks satu per satu dari disk ke memori.
2. **Nol Toleransi Typo (*Zero Typo-Tolerance*):**
   Jika calon pembeli salah ketik 1 huruf saja (misal mencari `"hoddie"` atau `"adids"`), query menghasilkan **0 produk**. Pembeli mengira barang habis lalu pergi meninggalkan toko (*lost sales*).
3. **Tidak Paham Akar Kata (*No Stemming*):**
   Pencarian `"running"` tidak akan menemukan barang dengan nama `"runner"` atau `"run"`.
4. **Tidak Ada Peringkat Relevansi (*Relevance Scoring*):**
   Produk dengan judul persis `"Black Oversized Hoodie"` diperlakukan setara dengan produk celana yang deskripsi bawahnya hanya menyebutkan *"cocok dipakai bersama hoodie"*.

---

## 2. Bagaimana Cara Kerja Full-Text Search (Inverted Index)?

Mesin pencari modern tidak membaca kalimat dari awal hingga akhir, melainkan membangun struktur data bernama **Inverted Index (Indeks Terbalik)**.

> **Analogi Sederhana:**
> Seperti lembar **Indeks Alfabetis di halaman paling belakang buku tebal**. Saat mencari kata *"Cotton"*, Anda tidak membaca buku dari halaman 1 sampai 500, melainkan langsung membuka lembar indeks huruf **C $\to$ Cotton: hal 14, 88, 120**.

```
[ CONTOH STRUKTUR INVERTED INDEX ]

Kata (Token)    -> Daftar ID Produk
-------------------------------------------
"hoodie"        -> [ ID: 1, ID: 5, ID: 12 ]
"oversized"     -> [ ID: 1, ID: 8 ]
"fleece"        -> [ ID: 1, ID: 12 ]
"adidas"        -> [ ID: 7, ID: 15 ]
```

Saat pembeli mengetik `"oversized hoodie"`, mesin FTS hanya mengambil irisan (*intersection*) ID `[1, 5, 12] \cap [1, 8] = [1]`. Hasilnya ditemukan dalam waktu **kurang dari 1 milidetik**.

---

## 3. Evaluasi Arsitektur: Elasticsearch vs PostgreSQL Native FTS

| Pembeda | Elasticsearch / Opensearch | PostgreSQL FTS (`pg_trgm` + GIN Index) |
|:---|:---|:---|
| **Infrastruktur** | Memerlukan kluster server Java terpisah (rakus RAM, min 2–4 GB). | **Sudah terpasang di PostgreSQL** (tanpa biaya server tambahan). |
| **Sinkronisasi Data** | **Rentan Inkonsisten:** Butuh *pipeline* CDC / message queue (Kafka/Logstash). Jika *sync* telat, barang terhapus masih muncul di pencarian. | **Konsistensi ACID 100%:** Produk yang di-insert/update/soft-delete langsung terindeks seketika tanpa delay. |
| **Pencarian Typo (Fuzzy)** | Sangat baik (algoritma Levenshtein / Damerau). | **Sangat akurat** via Trigram similarity (`word_similarity`). |
| **Skala Rekomendasi** | Sangat ideal untuk data teks raksasa (miliaran log / puluhan juta SKU seperti Tokopedia/Amazon). | **Sempurna untuk skala ribuan hingga ratusan ribu produk** (skala project Nexa). |

---

## 4. Implementasi Nyata di Codebase Project Nexa

Di database PostgreSQL project Nexa, kita mengaktifkan ekstensi **`pg_trgm`** dan membuat **GIN (Generalized Inverted Index)** pada kolom nama dan deskripsi produk:

### A. Ekstensi & GIN Index di Database PostgreSQL
```sql
-- 1. Mengaktifkan ekstensi Trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Membangun Inverted Index (GIN) untuk nama dan deskripsi produk
CREATE INDEX IF NOT EXISTS products_name_trgm_gin_idx ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_desc_trgm_gin_idx ON products USING gin (description gin_trgm_ops);
```

Dengan adanya indeks `gin_trgm_ops`, query `ILIKE '%...%'` yang digenerate oleh Prisma **secara otomatis diakselerasi menggunakan Bitmap Index Scan GIN** tanpa pernah melakukan *Full Table Scan*.

---

### B. Dual-Tier Typo-Tolerant Search di Model ([`product.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts#L123-L175))

Sistem pencarian produk menerapkan strategi 2 lapis (*Dual-Tier Strategy*):
1. **Tier 1 (Exact / Substring Match):** Mencari kecocokan kata menggunakan GIN Trigram Index melalui Prisma.
2. **Tier 2 (Fuzzy Typo-Tolerance Fallback):** Jika pencarian Tier 1 menghasilkan 0 barang (karena pembeli salah ketik), sistem otomatis mengeksekusi pencarian kemiripan kata (*word_similarity*) dan mengurutkan hasil berdasarkan **Skor Relevansi Tertinggi**.

```typescript
static async searchProductsFuzzy(
  query: string,
  limit: number = 10,
  cursor?: number
): Promise<{ products: ProductResponse[]; nextCursor: number | null }> {
  const cleanQuery = query.trim();

  // 1. Eksekusi pencarian exact / partial match via GIN Trigram Index
  const exactMatches = await this.getProductsByCursor(limit, cursor, cleanQuery);
  if (exactMatches.products.length > 0) {
    return exactMatches;
  }

  // 2. Fallback Typo-Tolerance: Hitung kemiripan trigram menggunakan word_similarity
  const cursorFilter = cursor ? Number(cursor) : 0;
  const fuzzyRows = await prisma.$queryRaw<any[]>`
    SELECT 
      p.id, 
      p.category_id, 
      p.name, 
      p.slug, 
      p.price, 
      p.img_url, 
      p.created_at,
      word_similarity(${cleanQuery}, p.name) AS score
    FROM products p
    WHERE p.deleted_at IS NULL
      AND (${cleanQuery} <% p.name OR word_similarity(${cleanQuery}, p.name) > 0.3)
      AND p.id > ${cursorFilter}
    ORDER BY score DESC, p.id ASC
    LIMIT ${limit + 1}
  `;

  let nextCursor: number | null = null;
  if (fuzzyRows.length > limit) {
    fuzzyRows.pop();
    nextCursor = fuzzyRows[fuzzyRows.length - 1].id;
  }

  return {
    products: fuzzyRows as any,
    nextCursor,
  };
}
```

---

### C. Integrasi di Service ([`product.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.service.ts#L31-L40))

```typescript
static async getProductFeed(
  limit: number = 10,
  cursor?: number,
  search?: string
): Promise<{ products: ProductResponse[]; nextCursor: number | null }> {
  // Jika ada parameter pencarian, aktifkan mesin FTS cerdas
  if (search && search.trim().length > 0) {
    return await ProductModel.searchProductsFuzzy(search.trim(), limit, cursor);
  }
  return await ProductModel.getProductsByCursor(limit, cursor);
}
```

---

## 5. Bukti Nyata Hasil Pengujian Sistem

Sistem telah diuji secara langsung terhadap basis data riil `db_nexa`:

### Pengujian 1: Pembeli Typo Mengetik `"Adids"`
* **Kata Kunci Pencarian:** `GET /api/v1/products?search=Adids`
* **Hasil Database:**
  ```json
  [
    {
      "id": 7,
      "name": "Adidas Stan Smith Low Women",
      "score": 0.666667
    }
  ]
  ```
* **Keterangan:** Mesin berhasil mendeteksi bahwa kata `"Adids"` memiliki kemiripan 66.7% dengan `"Adidas"` dan langsung menyajikannya di posisi teratas.

---

### Pengujian 2: Pembeli Typo Mengetik `"basketbal"`
* **Kata Kunci Pencarian:** `GET /api/v1/products?search=basketbal`
* **Hasil Database:**
  ```json
  [
    { "id": 27, "name": "Fastbreak Basketball Shoes Women", "score": 0.9 },
    { "id": 26, "name": "Air Pivot Basketball High Men", "score": 0.9 }
  ]
  ```
* **Keterangan:** Produk sepatu basket langsung ditemukan dengan skor kecocokan sempurna **0.9 (90%)**.

---

## 6. Rangkuman Best Practice

1. **Gunakan Inverted Index (GIN) untuk Pencarian Teks Bebas:** Menggantikan sequential scan yang boros CPU dengan index traversal instan.
2. **Pasang Threshold Kemiripan yang Ideal:** Ambang batas `word_similarity > 0.3` adalah standar emas untuk menyeimbangkan antara toleransi salah ketik dan relevansi kata.
3. **Prioritaskan Native FTS PostgreSQL Terlebih Dahulu:** Hindari kerumitan operasional dan biaya sewa server Elasticsearch jika volume data masih berada di bawah jutaan baris.

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Mesin pencari GIN Trigram (`pg_trgm`) telah aktif di PostgreSQL dengan toleransi salah ketik (*typo-tolerant fuzzy search*) pada ambang batas skor 0.3.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Synonym & Slang Mapping Dictionary (Kamus Istilah Streetwear):**  
   Saat pembeli mengetik kata `"baju"` atau `"kaos"`, mesin belum mengasosiasikannya dengan produk yang berjudul `"T-Shirt"` atau `"Graphic Tee"`. Batasan mentok FTS adalah memasang *Custom PostgreSQL Thesaurus/Synonym Dictionary*:
   ```text
   baju kaos tee : t-shirt
   sepatu : sneakers kicks
   celana : cargo pants
   ```
2. **Sub-millisecond Search Autocomplete via Redis Sorted Sets (ZSET):**  
   Pencarian saat ini mengeksekusi query database saat user menekan Enter. Batasan mentok untuk kotak pencarian modern (seperti Amazon/Tokopedia) adalah *Typeahead Autocomplete* berbasis Redis ZSET yang menyajikan 5 rekomendasi produk secara instan dalam **< 1ms** saat pengguna baru mengetik huruf ke-2.

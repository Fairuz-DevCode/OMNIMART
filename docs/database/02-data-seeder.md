# 02. Data Seeder

## 1. Masalah yang Terjadi
Setelah tabel database dibuat melalui migrasi, tabel masih dalam keadaan kosong (*blank*):
* **Hambatan Development & Testing:** Developer atau QA tidak bisa menguji tampilan UI storefront, katalog produk, pagination, keranjang belanja, atau proses login tanpa data awal.
* **Seeder Monolitik ("God Seeder"):** Menyatukan semua proses seeding (data user, kategori, ratusan produk, kompresi gambar) ke dalam 1 file raksasa membuat proses testing lambat, tidak fleksibel, dan rawan gagal di tengah jalan akibat benturan *Foreign Key*.
* **Duplikasi & Inkonsistensi:** Akun admin atau data dummy dibuat di banyak file berbeda dengan kredensial yang tidak seragam.

---

## 2. Solusi Best Practice
Menerapkan **Modular & Idempotent Data Seeder**:
1. **Urutan Foreign Key (Dependency Graph):**
   * Level 1: Tabel Master (Kategori, Pengguna)
   * Level 2: Tabel Entitas Utama (Produk, Keranjang)
   * Level 3: Tabel Detail (Varian Ukuran, Gambar, Item Keranjang)
2. **Idempotent (Aman Dijalankan Berulang):**
   * Menggunakan query `upsert` (Insert on Conflict Update) agar jika seeder dijalankan 10 kali, data tidak duplikat dan tidak memicu error *Unique Constraint*.
3. **Pemisahan Tanggung Jawab (Separation of Concerns):**
   * Memisahkan data mentah (*raw data payload*), logika seeder per domain, dan orkestrator utama.

---

## 3. Implementasi di Project Ini

Di project ini, seluruh seeder telah dipecah secara modular di dalam folder [`backend/src/seed/`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/seed/):

```text
backend/src/seed/
├── data/
│   └── productsData.ts        # Data array 25 produk & varian ukuran (terisolasi)
├── categorySeeder.ts          # Seeder khusus kategori sepatu/streetwear
├── userSeeder.ts              # Seeder admin (admin@nexa.com) & customer demo + cart
├── productSeeder.ts           # Seeder 25 produk + Sharp WebP compression
└── index.ts                   # Orkestrator yang menjalankan urutan dependensi
```

### A. Contoh Idempotent Seeding dengan Upsert
Contoh pada [`backend/src/seed/userSeeder.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/seed/userSeeder.ts):
```typescript
const admin = await prisma.users.upsert({
  where: { email: "admin@nexa.com" },
  update: { role: "admin" },
  create: {
    name: "Nexa Admin",
    email: "admin@nexa.com",
    password: adminPass,
    role: "admin",
    phone: "08123456789",
  },
});
```

### B. Otomatisasi Kompresi Aset Gambar
Di [`backend/src/seed/productSeeder.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/seed/productSeeder.ts), gambar sumber di-convert otomatis menjadi format modern **WebP (quality 80%)** menggunakan pustaka `sharp` sebelum URL disimpan ke database.

### C. Shortcut CLI di [`package.json`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/package.json#L16-L20)
Developer dapat menjalankan seeder secara terisolasi sesuai kebutuhan:
```bash
# Seed hanya kategori (cepat, < 0.2 detik)
npm run seed:categories

# Seed hanya user demo & admin (< 0.3 detik)
npm run seed:users

# Seed hanya 25 produk & kompresi WebP (< 1.5 detik)
npm run seed:products

# Seed seluruh database secara berurutan
npm run seed
```

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Seeder modular, terisolasi, dan idempoten (bisa dijalankan berkali-kali tanpa duplikasi data error) dengan kompresi WebP gambar produk.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **High-Volume Load Testing Generator (100.000+ Records):**  
   Saat ini seeder hanya menghasilkan 25 produk demo. Batasan mentok untuk pengujian performa query & index benchmark membutuhkan script seeder bervolume tinggi menggunakan `@faker-js/faker` dan PostgreSQL `COPY` command (bulk insert) untuk menyimulasikan 100.000 produk dan 500.000 pesanan dalam hitungan detik.
2. **Mock Realistic Order & Payment Transactions:**  
   Seeder saat ini hanya mengisi master data (produk, kategori, user), belum menyertakan data historis transaksi (pesanan, status settlement Midtrans, dan nomor resi pengiriman) yang diperlukan untuk pengujian grafik analitik penjualan dashboard admin.

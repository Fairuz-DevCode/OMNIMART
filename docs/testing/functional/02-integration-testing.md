# Functional Testing: Integration Testing Architecture

Dokumen ini membedah arsitektur dan metodologi **Deep State Integration Testing** pada sistem backend **Nexa Streetwear**.

---

## 1. Filosofi & Metodologi: Deep State & Persistence Verification

Banyak developer pemula terjebak pada pengujian integrasi yang **hanya memeriksa kode status HTTP** (`res.statusCode === 200`). Hal tersebut tergolong *superficial contract check* dan rentan memberikan ilusi keamanan semu (*false positive*), karena API bisa saja mengembalikan kode `200` padahal:
1. Data gagal tersimpan (*persisted*) ke tabel database (misalnya terhalang silent catch atau unhandled promise).
2. Data tersimpan dengan format enkripsi/hashing yang salah (misal plaintext password).
3. Entitas sekunder (seperti tabel relasi, token sesi, audit log) tidak terbuat.
4. Cache Redis tidak diperbarui (*stale cache* atau *cache invalidation failure*).

Oleh karena itu, Integration Testing di Nexa menerapkan prinsip **Tiga Lapis Verifikasi (Three-Tier Assertion)**:
```
[1. HTTP Request (supertest)] 
        │
        ▼
[2. Express Middlewares & Controller Handler] 
        │
        ▼
[3. Direct State Verification (Real PostgreSQL & Redis Assertions)]
    ├── Cek tabel target (users, orders, wishlists, product_reviews, dll)
    ├── Cek tabel sekunder & relasi (refresh_tokens, audit_logs)
    └── Cek cache key di RAM Redis & Response Header X-Cache (HIT/MISS)
```

---

## 2. Matriks Pengujian Seluruh 12 Modul API

Pengujian mencakup 12 berkas yang merepresentasikan 100% modul routing backend dengan verifikasi langsung ke database:

| No | Modul API | Berkas Test | Endpoint yang Diuji | Database & Cache Assertions (Verifikasi Nyata) |
|:---:|:---|:---|:---|:---|
| 01 | **Health & Probes** | [01-health.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/01-health.integration.test.ts) | `GET /api/health` | Status 200, metrik V8 heap memory, uptime, latency probe DB & Redis. |
| 02 | **Authentication** | [02-auth.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/02-auth.integration.test.ts) | `POST /api/auth/register`<br/>`POST /api/auth/login` | Direct DB: Verifikasi row di `users`, validasi password ter-hash bcrypt (`$2...`), verifikasi row di `refresh_tokens`, dan verifikasi tercatat di `audit_logs`. |
| 03 | **User Profile** | [03-users.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/03-users.integration.test.ts) | `GET /api/users/me` | Direct DB: Membandingkan respons profil terhadap baris aktual di tabel `users` (kesamaan ID, nama, dan email). |
| 04 | **Addresses** | [04-addresses.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/04-addresses.integration.test.ts) | `GET /api/addresses` | Direct DB: Memverifikasi jumlah alamat dalam array respons sesuai dengan `prisma.addresses.count()` milik user tersebut. |
| 05 | **Categories** | [05-categories.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/05-categories.integration.test.ts) | `GET /api/categories` | Direct DB: Menghitung kategori aktif di PostgreSQL (`deleted_at: null`) dan mencocokkan jumlah elemen dengan respons API. |
| 06 | **Products** | [06-products.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/06-products.integration.test.ts) | `GET /api/products` | Direct DB & Redis: Memverifikasi item katalog terhadap tabel `products`, memeriksa keberadaan key `products:*` di memori RAM Redis, dan memverifikasi header `X-Cache: HIT`. |
| 07 | **Shopping Cart** | [07-cart.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/07-cart.integration.test.ts) | `GET /api/carts` | Direct DB: Memvalidasi bahwa keranjang belanja yang dikembalikan sesuai dengan record di tabel `carts` milik user. |
| 08 | **Orders** | [08-orders.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/08-orders.integration.test.ts) | `GET /api/orders` | Direct DB: Memastikan riwayat pesanan yang dikembalikan sesuai dengan jumlah baris di tabel `orders`. |
| 09 | **Payments** | [09-payments.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/09-payments.integration.test.ts) | `GET /api/payments/order/:id` | Direct DB: Memverifikasi data pembayaran, Midtrans URL, dan status transaksi terhadap baris di tabel `payments`. |
| 10 | **Shipping** | [10-shippings.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/10-shippings.integration.test.ts) | `GET /api/shippings/order/:id`<br/>`POST /api/shippings/calculate` | Direct DB: Memverifikasi nomor resi dan kurir terhadap baris di tabel `shippings`, serta menguji mesin kalkulasi tarif ongkir dinamis. |
| 11 | **Reviews** | [11-reviews.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/11-reviews.integration.test.ts) | `GET /api/products/:id/reviews`<br/>`POST /api/products/:id/reviews` | Direct DB: Mencocokkan count ulasan publik dengan tabel `product_reviews`, melakukan mutasi POST review baru, dan memverifikasi baris terinsert ke PostgreSQL. |
| 12 | **Wishlist** | [12-wishlists.integration.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration/12-wishlists.integration.test.ts) | `POST /api/wishlist/toggle`<br/>`GET /api/wishlist` | Direct DB: Menguji siklus Toggle Add $\to$ Verifikasi baris di `wishlists` PostgreSQL $\to$ Toggle Remove $\to$ Verifikasi baris terhapus (NULL) di PostgreSQL. |

---

## 3. Cara Menjalankan

```bash
# Menjalankan seluruh Integration Test (12 berkas - 30 tests)
npm run test:integration
```

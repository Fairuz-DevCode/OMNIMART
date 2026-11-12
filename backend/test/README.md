# Nexa Streetwear Enterprise Test Suite Hub

Pusat pengujian otomatis (*Automated Testing Suite*) menyeluruh untuk backend **Nexa Streetwear E-Commerce**, memisahkan secara ketat antara **Functional Testing** (Unit, Integration untuk seluruh API Route, dan E2E) serta **Non-Functional Testing** (Keamanan OWASP dan Performa Beban).

---

## 📁 Struktur Hirarki Lengkap (`backend/test/`)

```
backend/test/
├── README.md                                       # Master guide arsitektur & eksekusi testing
│
├── functional/                                     # 1. FUNCTIONAL TESTING (Logika & Alur Bisnis)
│   ├── unit/                                       # Pure Domain Logic & Zod DTO Validation (8 Berkas)
│   │   ├── authValidation.test.ts                 # Validasi DTO: Register, Login, Email, Password, Nama forbidden
│   │   ├── userValidation.test.ts                 # Validasi DTO: Profile, No HP wilayah ID via libphonenumber, Ganti password
│   │   ├── cartAndOrderValidation.test.ts         # Validasi DTO: Add Cart, Update Cart, Create Order, positive integer
│   │   ├── addressAndShippingValidation.test.ts   # Validasi DTO: Label, Phone regex 10-15 digit, Postal Code 5 digit, Courier
│   │   ├── reviewAndPaymentValidation.test.ts     # Validasi DTO: Rating 1-5, Komentar max 500 karakter, Payment schema
│   │   ├── orderCalculation.test.ts               # Domain logic: Kalkulasi subtotal, diskon voucher, pembulatan kg ongkir, stok
│   │   ├── jwtAuthToken.test.ts                   # Domain utils: JWT access 15m, refresh 7d, 2FA token, tamper check, bcrypt
│   │   └── cryptoVaultAndAppError.test.ts         # Domain utils: AES-256-GCM encryption/decryption & AppError 4xx vs 5xx
│   │
│   ├── integration/                                # Pengujian Komprehensif SEMUA 12 API MODULES (12 Berkas)
│   │   ├── 01-health.integration.test.ts          # Route /api/health (Uptime, V8 memory metrics, PostgreSQL & Redis check)
│   │   ├── 02-auth.integration.test.ts            # Route /api/auth (Register, Login, Refresh token rotation, Logout)
│   │   ├── 03-users.integration.test.ts           # Route /api/users (Profile /me, Update name, Change password)
│   │   ├── 04-addresses.integration.test.ts       # Route /api/addresses (CRUD data alamat customer & proteksi autentikasi)
│   │   ├── 05-categories.integration.test.ts      # Route /api/categories (Daftar kategori hierarkis publik)
│   │   ├── 06-products.integration.test.ts        # Route /api/products (Katalog produk, pagination cursor & offset, search)
│   │   ├── 07-cart.integration.test.ts            # Route /api/carts (User shopping cart items, add, update, barrier guest)
│   │   ├── 08-orders.integration.test.ts          # Route /api/orders (Checkout atomik, Idempotency-Key, Anti-BOLA/IDOR)
│   │   ├── 09-payments.integration.test.ts        # Route /api/payments (Midtrans payment token & webhook callback)
│   │   ├── 10-shippings.integration.test.ts       # Route /api/shippings (Kalkulasi tarif kurir, input resi, status tracking)
│   │   ├── 11-reviews.integration.test.ts         # Route /api/products/:id/reviews (Ulasan produk & kalkulasi rating bintang)
│   │   └── 12-wishlists.integration.test.ts       # Route /api/wishlist (Simpan produk favorit & toggle status)
│   │
│   └── e2e/                                        # End-to-End Simulation Journeys (2 Berkas)
│       ├── customerJourney.test.ts                # Alur Pembeli: Probe -> Catalog browsing -> Cart -> Checkout barrier
│       └── adminManagementJourney.test.ts         # Alur Admin: RBAC protection, upload produk barrier, resi & audit barrier
│
└── non-functional/                                 # 2. NON-FUNCTIONAL TESTING (Keamanan & Performa)
    ├── security/                                   # Pengujian Mitigasi Serangan Cyber (OWASP Top 10)
    │   ├── sqlInjectionDefense.test.ts            # Bypass ' OR '1'='1, DROP TABLE, union SELECT injection
    │   ├── xssAndPayloadDefense.test.ts           # Helmet security headers, 1MB DoS payload limit, sanitasi XSS tags
    │   └── rateLimitingAndBruteForce.test.ts      # Header RateLimit RFC 6585, proteksi brute-force login
    │
    └── performance/                                # Pengujian Latensi, Throughput, & Lonjakan Beban
        ├── internalLatencyBenchmark.ts            # Benchmark sub-millisecond Redis RAM (<5ms) & ping pool PostgreSQL
        ├── k6-load-test.js                        # Skrip Grafana k6 untuk steady load 50 Virtual Users (p95 < 200ms)
        └── k6-spike-flashsale.js                  # Skrip Grafana k6 simulasi ledakan 300 Virtual Users Flash Sale
```

---

## 🚀 Perintah Menjalankan Pengujian (Cheatsheet)

```bash
# 1. Menjalankan SELURUH Unit Test (Semua Validasi & Utils - 30 tests)
npm run test:unit

# 2. Menjalankan SELURUH Integration Test (Semua 12 API Modules - 26 tests)
npm run test:integration

# 3. Menjalankan SELURUH End-to-End Test (Customer & Admin Journey)
npm run test:e2e

# 4. Menjalankan SEMUA Functional Test (Unit + Integration + E2E)
npm run test:functional

# 5. Menjalankan SEMUA Security Test (SQLi, XSS, 1MB Payload, Rate Limit)
npm run test:security

# 6. Menjalankan Benchmark Latensi Internal (Redis & DB Pool)
npm run test:perf

# 7. Menjalankan Load Test Grafana k6
npm run test:k6:load
npm run test:k6:spike

# 8. Menjalankan SEMUA Test Suite Sekaligus
npm test
```

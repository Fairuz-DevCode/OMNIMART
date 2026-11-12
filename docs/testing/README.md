# Nexa Streetwear Enterprise Testing Architecture

Selamat datang di pusat dokumentasi dan strategi pengujian (**Testing Suite**) platform **Nexa Streetwear**.

Sistem pengujian diatur mengikuti standar industri arsitektur monorepo: memisahkan **Frontend UI Testing**, **Backend API Testing (Functional & Non-Functional)**, dan **Root-Level End-to-End (E2E) Browser Testing**.

---

## 1. Peta Navigasi Arsitektur Testing

```
Streetwear | E-commerce Project/
├── e2e/                           <-- FULL-STACK BROWSER E2E (Playwright)
│   ├── 01-landing-and-catalog.spec.ts
│   ├── 02-auth-journey.spec.ts
│   └── 03-protected-routes.spec.ts
│
├── frontend/                      <-- FRONTEND UI TESTING (Vitest + React Testing Library)
│   ├── test/unit/                 (Utility imageUrl & validasi skema Zod)
│   └── test/components/           (Komponen Button & EmptyState di JSDOM)
│
└── backend/                       <-- BACKEND API TESTING (Node Test Runner + Supertest)
    ├── test/functional/
    │   ├── unit/                  (8 berkas - 30 tests logika murni & kalkulasi)
    │   └── integration/           (12 berkas - 30 tests modul API + PostgreSQL + Redis)
    └── test/non-functional/
        ├── security/              (3 berkas - 8 tests SQLi, XSS, Rate Limiting)
        └── performance/           (Latency ping internal & Grafana k6 stress script)
```

---

## 2. Direktori Panduan Lengkap

1. [Dokumentasi Frontend Testing](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/testing/04-frontend-testing.md)
   - Panduan dasar pengujian Frontend React (Unit vs Component vs E2E).
   - Penjelasan React Testing Library, JSDOM, dan Vitest.
2. [Functional Testing Overview](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/testing/functional/README.md)
   - [01-unit-testing.md](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/testing/functional/01-unit-testing.md) - Pengujian unit DTO Zod, perhitungan diskon kupon, pembulatan berat ekspedisi, JWT, dan CryptoVault.
   - [02-integration-testing.md](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/testing/functional/02-integration-testing.md) - Pengujian integrasi 12 modul API dengan verifikasi langsung ke PostgreSQL dan Redis.
   - [03-end-to-end-testing.md](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/testing/functional/03-end-to-end-testing.md) - Pengujian alur belanja menyeluruh (Playwright Browser E2E di root & Backend API Journey).
3. [Non-Functional Testing Overview](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/testing/non-functional/README.md)
   - [01-security-testing.md](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/testing/non-functional/01-security-testing.md) - Pertahanan SQL Injection, XSS Payload sanitization, Express payload size limit, dan Redis rate limiting.
   - [02-performance-testing.md](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/testing/non-functional/02-performance-testing.md) - Benchmark latensi internal PostgreSQL pool & Redis RAM, serta skrip Grafana k6 untuk stress load dan flash sale spike.

---

## 3. Ringkasan Eksekusi Perintah Pengujian

Dari direktori root workspace, Anda dapat menjalankan perintah terpusat:

```bash
# Menjalankan seluruh test backend dan frontend sekaligus (94 tests)
npm test

# Menjalankan spesifik backend saja (75 tests)
npm run test:backend

# Menjalankan spesifik frontend saja (19 tests)
npm run test:frontend

# Menjalankan E2E Playwright Browser testing di root
npm run test:e2e
```

# Frontend Testing Architecture & Guide (React 19 + Vitest)

Dokumen ini menjelaskan arsitektur, filosofi, dan panduan lengkap pengujian **Frontend UI** pada platform **Nexa Streetwear**.

---

## 1. Memahami Frontend Testing: Apa Bedanya dengan Backend?

Banyak developer merasa bingung saat pertama kali menguji Frontend karena frontend berurusan dengan **tampilan visual, event interaksi user (klik/ketik), dan DOM**.

Di Nexa, Frontend Testing dibagi menjadi 3 tingkatan yang sangat jelas:

```
          ▲
         / \       [Layer 3: E2E Playwright Browser Testing]
        /   \      Uji browser nyata: klik tombol, navigasi URL, alur belanja
       /-----\
      /       \    [Layer 2: React Component Testing (JSDOM)]
     /         \   Uji render komponen, event onClick, state loading, props
    /-----------\
   /             \ [Layer 1: Frontend Unit Testing]
  /               \Uji fungsi murni: format gambar (imageUrl), validasi Zod (authSchema)
  -----------------
```

---

## 2. Struktur Pengujian Frontend (`frontend/test/`)

Struktur folder pengujian frontend ditata secara rapi dan modular:

```text
frontend/
├── vitest.config.ts          <-- Konfigurasi test runner Vitest + React + JSDOM
├── test/
│   ├── setup.ts              <-- Setup @testing-library/jest-dom matchers
│   ├── unit/                 <-- LAYER 1: UNIT TESTING LOGIKA & UTILITY
│   │   ├── imageUrl.test.ts  <-- Uji fallback gambar, URL CDN eksternal, & relative paths
│   │   └── authSchema.test.ts<-- Uji validasi Zod (nama terlarang, email, password strength)
│   └── components/           <-- LAYER 2: COMPONENT TESTING (UI)
│       ├── Button.test.tsx   <-- Uji render teks, event klik, state loading spinner
│       └── EmptyState.test.tsx <-- Uji tampilan kosong, link aksi, & handler tombol
```

---

## 3. Penjelasan Layer Pengujian

### Layer 1: Frontend Unit Testing (Logika & Skema Zod)
Menguji kode logika JavaScript/TypeScript murni tanpa me-render visual HTML:
- **[imageUrl.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/frontend/test/unit/imageUrl.test.ts)**:
  - Memastikan input `null`/kosong menghasilkan URL fallback Unsplash yang estetis.
  - Memastikan URL eksternal (CDN) tidak tertimpa oleh prefix localhost.
  - Memastikan path lokal otomatis digabung dengan `BACKEND_BASE` URL.
- **[authSchema.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/frontend/test/unit/authSchema.test.ts)**:
  - Memastikan validasi di sisi client menolak nama/email yang mengandung kata terlarang (`admin`, `root`).
  - Menguji aturan 5 parameter password (8 karakter, kapital, huruf kecil, angka, simbol).

### Layer 2: Component Testing (React Testing Library)
Menguji komponen React individual di dalam lingkungan browser virtual (**JSDOM**):
- **[Button.test.tsx](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/frontend/test/components/Button.test.tsx)**:
  - Memverifikasi teks tombol muncul di layar (`getByRole('button')`).
  - Memastikan `onClick` terpicu saat tombol diklik.
  - Memastikan tombol menjadi `disabled` dan menampilkan ikon *spinner* serta teks `"Sedang Memproses..."` saat `isLoading={true}`.
- **[EmptyState.test.tsx](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/frontend/test/components/EmptyState.test.tsx)**:
  - Menguji pesan *placeholder* ketika keranjang atau daftar produk kosong.
  - Memvalidasi tombol aksi memicu fungsi atau mengarahkan ke link React Router.

---

## 4. Cara Menjalankan Frontend Test

Buka terminal dan jalankan:

```bash
# 1. Jalankan test frontend sekali jalan
npm run test:frontend

# Atau masuk ke folder frontend
cd frontend
npm test

# 2. Mode interaktif/watch saat sedang coding
npm run test:watch
```

Output:
```text
 ✓ test/unit/imageUrl.test.ts (4 tests)
 ✓ test/unit/authSchema.test.ts (7 tests)
 ✓ test/components/Button.test.tsx (4 tests)
 ✓ test/components/EmptyState.test.tsx (4 tests)

 Test Files  4 passed (4)
      Tests  19 passed (19)
   Duration  1.26s
```

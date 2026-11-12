# Functional Testing: End-to-End (E2E) Architecture

Dokumen ini membedah arsitektur dan strategi **End-to-End (E2E) Testing** pada sistem **Nexa Streetwear**.

---

## 1. Posisi E2E dalam Monorepo

Sesuai kaidah *Separation of Concerns* dan standar arsitektur industri monorepo, **End-to-End (E2E) Testing berada di level ROOT (di luar)**, berdiri sejajar dengan folder `frontend/` dan `backend/`:

```
[Root Monorepo]
├── e2e/                             <-- FULL-STACK BROWSER E2E (Playwright)
│   ├── 01-landing-and-catalog.spec.ts  (Uji nyata klik & render di Chromium)
│   ├── 02-auth-journey.spec.ts         (Uji login & form submission)
│   └── 03-protected-routes.spec.ts     (Uji proteksi route & redirect)
│
├── frontend/                        <-- Frontend React 19 UI
│   └── test/                           (Unit & Component Testing dengan Vitest)
│
└── backend/                         <-- Backend Express API
    └── test/                           (Unit validation & Integration 12 API modules)
```

Folder `backend/` kini murni hanya mengurus **Unit Testing** dan **Integration Testing** (tidak ada lagi E2E di dalam backend).

---

## 2. Cakupan Full-Stack Browser E2E (`e2e/`)

Pengujian E2E menggunakan **Playwright** untuk mengontrol browser Chromium nyata. Pengujian ini tidak menggunakan mock: browser membuka antarmuka Frontend, melakukan klik, dan Frontend mengirim request HTTP nyata ke Backend.

| Berkas Spec | Skenario yang Diuji |
|:---|:---|
| [01-landing-and-catalog.spec.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/e2e/01-landing-and-catalog.spec.ts) | Membuka homepage `/`, memverifikasi Navbar, Hero banner, dan bernavigasi ke katalog produk `/product`. |
| [02-auth-journey.spec.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/e2e/02-auth-journey.spec.ts) | Membuka form login `/login`, memvalidasi input email & password, serta navigasi menuju pendaftaran akun baru `/register`. |
| [03-protected-routes.spec.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/e2e/03-protected-routes.spec.ts) | Memverifikasi barrier keamanan: pengguna guest yang mencoba langsung masuk ke `/cart`, `/checkout`, atau `/profile` otomatis diredirect ke `/login`. |

---

## 3. Cara Menjalankan Playwright E2E

Dari root workspace:
```bash
# Menjalankan seluruh test E2E di browser
npm run test:e2e
```

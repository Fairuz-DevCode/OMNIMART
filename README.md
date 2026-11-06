# 🛒 OMNIMART - Streetwear & Fashion E-Commerce Platform

OMNIMART adalah platform e-commerce fullstack modern bertema *streetwear & fashion* dengan arsitektur monorepo yang siap diintegrasikan dengan aplikasi mobile (Flutter).

---

## 🏗️ Tech Stack & Arsitektur

* **Backend:**
  * Node.js & Express (TypeScript)
  * Prisma ORM & PostgreSQL
  * Redis (Caching & Rate Limiting)
  * Midtrans Snap Payment Gateway
  * Docker & Docker Compose
* **Frontend (Web):**
  * React & TypeScript
  * Vite & Tailwind CSS
* **Mobile (Upcoming):**
  * Flutter (Android & iOS)

---

## 📁 Struktur Direktori

```text
OMNIMART/
├── backend/          # RESTful API Service (Node.js, Express, Prisma)
├── frontend/         # Web Storefront & Admin Dashboard (React, Vite)
├── mobile/           # Mobile App (Flutter - upcoming)
├── docs/             # Dokumentasi API & Database Schema
├── img/              # Asset gambar & banner produk
└── docker-compose.yml # Orkestrasi container PostgreSQL, Redis, Backend
```

---

## 🚀 Memulai (Quick Start)

### 1. Clone Repository
```bash
git clone https://github.com/Fairuz-DevCode/OMNIMART.git
cd OMNIMART
```

### 2. Jalankan dengan Docker Compose
```bash
docker-compose up -d
```

### 3. Setup Backend
```bash
cd backend
npm install
npx prisma db push
npm run seed
npm run dev
```

### 4. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```

---

## 🛡️ Fitur Utama

- 🔐 **Autentikasi Aman:** JWT Token, Refresh Token, 2FA, & Role-based Access Control (Admin & Customer).
- ⚡ **Performa Tinggi:** Database indexing B-Tree, pencegahan N+1 Query dengan batching, dan in-memory caching Redis.
- 💳 **Pembayaran Otomatis:** Integrasi Midtrans Payment Gateway dengan webhook handling.
- 📦 **Manajemen Pesanan:** Alur checkout transaksi ACID via `prisma.$transaction`, manajemen stok varian, dan tracking pengiriman kurir.

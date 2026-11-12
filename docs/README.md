# Nexa Streetwear Documentation Hub

Selamat datang di pusat dokumentasi teknis dan arsitektur untuk sistem **Nexa Streetwear E-Commerce**.

---

## 📌 Indeks Dokumentasi Utama

| Dokumen / Panduan | Deskripsi & Fokus Utama | Target Pembaca |
|:---|:---|:---:|
| 🌟 [**STANDAR_MINIMUM_VS_ENTERPRISE.md**](./STANDAR_MINIMUM_VS_ENTERPRISE.md) | **Klasifikasi Standar E-Commerce:** Memisahkan standar *Bare Minimum* (kriteria wajib siap jual freelance/UMKM) vs *Standar Mentok* (arsitektur enterprise skala jutaan pengguna). | Developer, Freelancer, Tech Lead |
| 🏛️ [**Architecture & Resilience Guides (`docs/architecture/`)**](./architecture/README.md) | **Panduan Arsitektur & Keandalan Terdistribusi:** WebSocket, gRPC, Message Queues BullMQ, Saga Pattern, Idempotency, Timeouts, Exponential Backoff, dan Payload Management. | System Architect, Tech Lead, Senior Backend |
| 🏗️ [**Infrastructure & DevOps Guides (`docs/infrastructure/`)**](./infrastructure/README.md) | **Panduan Infrastruktur & Gateway:** Docker Multi-Stage, CI/CD GitHub Actions, Kubernetes HPA, Load Balancing, Nginx Reverse Proxy, dan API Gateway. | DevOps, SysAdmin, Backend Dev |
| ⚡ [**Performance Architecture & Guides (`docs/performance/`)**](./performance/README.md) | **Panduan Optimasi Performa & Latensi:** Redis Caching, Stale Cache Invalidation, Memory Leak, OOM, Disk I/O Bottleneck, TCP Port Exhaustion, dan Type Assertions. | Fullstack / Backend Dev, DevOps |
| 🗄️ [**Database Architecture & Guides (`docs/database/`)**](./database/README.md) | **21 Panduan Teknis Database:** Optimasi query, mitigasi N+1, ACID transactions, Prisma ORM, B-Tree indexing, koneksi pool, sharding, dan replikasi. | Backend Engineer, DBA |
| 🛡️ [**Security Architecture & Guides (`docs/security/`)**](./security/README.md) | **16 Panduan Teknis Keamanan (OWASP):** SQL Injection, JWT dual-token lifecycle, CORS, RBAC, Rate Limiting, MFA TOTP, XSS, CSRF, dan Audit Logging. | Backend Engineer, Security Engineer |
| 🧪 [**Automated Testing Suite (`docs/testing/`)**](./testing/README.md) | **Pusat Pengujian Otomatis (71 Tests):** Functional Testing (Unit, Integration seluruh 12 API route, E2E) & Non-Functional Testing (Security OWASP, Performance k6 & Latency). | QA, Backend Dev, Tech Lead |
| 🔌 [**API Specification & Guides (`docs/api/`)**](./api/README.md) | **Dokumentasi Kontrak REST API:** Endpoint autentikasi, user & alamat, katalog produk, keranjang, checkout, dan integrasi pembayaran. | Frontend & Mobile Dev, QA |
| 📋 [**PRD_NEXA_STOREFRONT.md**](./PRD_NEXA_STOREFRONT.md) | **Product Requirements Document (PRD):** Spesifikasi lengkap fitur, user flow, arsitektur data, dan roadmap sistem toko online. | Product Manager, Developer |

---

## Ringkasan Cepat: Kesiapan Produksi Nexa Streetwear

Project ini sudah dilengkapi dengan fondasi **Mid-to-High Production Grade**:
- ✅ **Database Integrity:** 100% Parameterized queries, atomic stock decrement transactions, dan CHECK constraints.
- ✅ **Keamanan Modern:** Dual-token JWT (Access Token 15 menit + Refresh Token di Cookie HttpOnly Strict), Rate limiting 3-tier, proteksi BOLA/IDOR, dan audit logging tersensor otomatis.
- ✅ **High-Throughput Caching:** Redis Cache-Aside dengan mitigasi stale data otomatis, non-blocking `SCAN` key invalidation, dan header `X-Cache: HIT/MISS`.
- ✅ **Payment Gateway:** Terintegrasi Midtrans Snap & Webhook Verification berbasis HMAC SHA512 signature.
- ✅ **Performa Ringan:** Siap di-deploy pada VPS hemat resource (1-2 vCPU / 2GB RAM) tanpa memerlukan cluster server yang mahal.

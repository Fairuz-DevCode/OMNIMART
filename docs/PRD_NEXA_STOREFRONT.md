# Product Requirements Document (PRD)
## NEXA Streetwear & Footwear E-Commerce Platform
**Target Platforms**: Web Storefront (React 18 + Vite + Tailwind CSS) & Mobile App (Flutter for iOS & Android)  
**Backend**: Node.js, Express (TypeScript), Prisma ORM, PostgreSQL, Redis, Midtrans Snap  
**Document Status**: Ready for Engineering & AI Design Prompting (v1.0)

---

## 1. Executive Summary

### Problem Statement
Penggemar *streetwear* dan *sneakers* di Indonesia sering menghadapi kendala pengalaman belanja digital yang terfragmentasi, minimnya konsultasi ukuran (*size recommendation*) secara *real-time*, serta lambatnya respons penanganan kendala pesanan/resi oleh layanan pelanggan (CS manual).

### Proposed Solution
NEXA menghadirkan ekosistem e-commerce *omnichannel* (Web & Mobile) berbasis visual modern berestetika *clean high-street*, ditenagai integrasi pembayaran otomatis Midtrans, serta asisten cerdas **Hybrid AI Chatbot & Live Support** yang mendampingi pelanggan mulai dari rekomendasi produk hingga pelacakan resi 24/7.

### Success Criteria (KPIs)
1. **Chatbot Resolution Rate**: $\ge 70\%$ pertanyaan umum (FAQ, status resi, size guide) terselesaikan oleh AI tanpa eskalasi ke agen manusia.
2. **Checkout Conversion Rate**: Meningkat $\ge 3.8\%$ dari alur checkout terpadu (*single-page checkout* / seamless sheet).
3. **P95 Latency Performance**: API Response time p95 $\le 200\text{ ms}$ untuk listing katalog dan validasi transaksi Midtrans webhook.
4. **Web & Mobile Performance**: Skor Google Lighthouse $\ge 95$ pada Performance, Accessibility, dan Best Practices di Web; 60 FPS konsisten di Flutter.

---

## 2. User Experience & Functionality

### User Personas
* **Persona A: Reza (24, Streetwear Enthusiast & Sneakerhead)**  
  *Kebutuhan*: Mencari drop sepatu sneakers terbaru dengan visual detail resolusi tinggi, ingin kepastian ukuran pas tanpa repot retur, dan proses checkout kilat via GoPay/ShopeePay/QRIS di ponsel.
* **Persona B: Sarah (29, Casual Fashion Buyer)**  
  *Kebutuhan*: Membeli sepatu formal atau kasual kerja, sering membutuhkan konfirmasi kebijakan retur dan estimasi ongkir cepat lewat chat interaktif sebelum membayar.
* **Persona C: Nexa Store Admin / CS Officer**  
  *Kebutuhan*: Mengelola pesanan, stok varian ukuran, dan menerima limpahan (*handoff*) tiket chat dari AI ketika ada komplain pembayaran atau retur manual.

---

### User Stories & Acceptance Criteria

#### US-1: Hero & Category Discovery (Landing Page)
* **Story**: Sebagai calon pembeli, saya ingin melihat kurasi produk unggulan dan kategori sepatu/pakaian di halaman depan agar saya dapat langsung menemukan kategori yang saya inginkan.
* **Acceptance Criteria**:
  * Hero banner menampilkan produk *featured* 3D/floating visual dengan tombol aksi *primary* ("Shop Now") dan *secondary* ("Explore More").
  * Menampilkan 4 pilar *Value Proposition*: Free Delivery (> IDR 500.000), 30-Day Easy Returns, 100% Secure Checkout, dan 24/7 Support.
  * Grid Kategori Pilihan (*Sneakers & Kasual, Formal & Dress Shoes, Boots, Heels & Flats*) dengan indikator hover card elevasi dan link menuju katalog terfilter.

#### US-2: Hybrid Chat Widget (AI Chatbot & CS Support)
* **Story**: Sebagai pengguna, saya ingin berkonsultasi mengenai produk, panduan ukuran, atau status pesanan melalui widget chat mengambang kapan saja.
* **Acceptance Criteria**:
  * Widget *Floating Action Button* (FAB) hadir di pojok kanan bawah pada Web (`z-index: 50`) dan Mobile.
  * **Level 1 (AI Bot)**: Mampu mengecek database pesanan berdasarkan Nomor Pesanan (misal: `ORD-XXXX`), memberikan *size chart guide*, serta rekomendasi kategori.
  * **Level 2 (Human Handoff)**: Jika user mengetikkan "Hubungi CS" atau AI mendeteksi sentimen frustrasi/komplain pengembalian dana, muncul tombol CTA *"Hubungi Tim CS Nexa"* yang menghubungkan langsung ke Admin Support atau direct fallback WhatsApp Admin.

#### US-3: Product Catalog & Variant Selection
* **Story**: Sebagai pembeli, saya ingin memilih ukuran sepatu/pakaian dengan informasi ketersediaan stok *real-time* agar saya tidak memesan barang yang habis.
* **Acceptance Criteria**:
  * Pilihan ukuran sepatu (e.g. EU 39, 40, 41, 42, 43, 44) menampilkan status *Out of Stock* secara dinamis berdasarkan tabel `product_variants`.
  * Integrasi Quick Add to Cart Drawer tanpa me-refresh halaman (*slide-over sheet*).

#### US-4: Seamless Checkout & Midtrans Payment
* **Story**: Sebagai pembeli, saya ingin menyelesaikan pembayaran pesanan menggunakan QRIS, Virtual Account (BCA, Mandiri, BNI, BRI), atau E-Wallet dalam mata uang IDR.
* **Acceptance Criteria**:
  * Perhitungan ongkos kirim dan total tagihan dikunci dalam ACID transaction database (`prisma.$transaction`).
  * Muncul Midtrans Snap Modal (Web) atau In-App Webview (Flutter) secara instan.
  * Status pesanan berubah otomatis dari `pending` ke `paid` setelah menerima *Webhook Signature Validated* dari Midtrans.

---

### Non-Goals (Scope Boundary)
* ❌ **Bukan Multi-vendor Marketplace**: Tidak mendukung banyak penjual independen (Tokopedia/Shopee style); platform bersifat *single-brand direct-to-consumer (D2C)*.
* ❌ **Bukan Full AR Virtual Try-On (v1.0)**: Fitur AR kamera 3D untuk memproyeksikan sepatu ke kaki belum masuk scope v1 (dijadwalkan untuk v2.0).
* ❌ **Bukan Crypto/Cross-border Multi-currency (v1.0)**: Seluruh transaksi awal dikunci dalam Rupiah (IDR) via Midtrans.

---

## 3. AI System Requirements (AI Stylist & Chatbot Assistant)

### Arsitektur AI Hybrid Chatbot
```
[User Chat Input] ──> [Nexa Chat Gateway]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Intent: Order & FAQ]             [Intent: Human Needed / Complex]
            │                                 │
   [Nexa RAG / Tools API]           [Escalate to Admin Dashboard / WA]
    ├── Cek Resi (DB Query)
    ├── Size Recommender (Logic)
    └── Knowledge Base (FAQ JSON)
            │
   [LLM Response (ID/EN)]
```

### Tool & Function Calling Requirements
AI Engine dilengkapi *Tool Calling* terbatas dengan parameter terverifikasi:
1. `check_order_status(order_number: string)`: Memanggil internal API `/api/orders/:order_number` untuk membaca `orders.status` dan `shippings.tracking_number`.
2. `recommend_shoe_size(foot_length_cm: number, shoe_type: string)`: Menghitung rekomendasi ukuran EU standard berdasarkan data panduan sizing.
3. `search_catalog(category: string, max_price?: number)`: Mengambil 3 produk teratas yang relevan untuk disematkan sebagai kartu mini (*interactive carousel card*) di dalam chat.

### Evaluation Strategy & Guardrails
* **Grounding & Accuracy**: AI tidak diperbolehkan mengarang diskon atau mengklaim stok barang tanpa data dari API (`Hallucination Rate < 1%`).
* **Fallback Protocol**: Jika AI tidak dapat menjawab pertanyaan user setelah 2 turn berturut-turut, otomatis munculkan prompt *"Apakah Anda ingin berbicara dengan staf kami?"*.

---

## 4. Technical Specifications & Architecture

### High-Level Architecture Diagram
```
                     ┌───────────────────────────────────┐
                     │            Clients                │
                     │  - React 18 Web (Vite + Tailwind) │
                     │  - Flutter Mobile (iOS & Android) │
                     └─────────────────┬─────────────────┘
                                       │ HTTPS / WSS
                                       ▼
                     ┌───────────────────────────────────┐
                     │    Node.js Express API (TypeScript)│
                     │  - JWT + 2FA Auth Middleware      │
                     │  - Rate Limiting (Redis)          │
                     │  - Chatbot & WebSocket Gateway    │
                     └───────┬──────────────┬────────────┘
                             │              │
             ┌───────────────┴────┐         ├────────────────────┐
             ▼                    ▼         ▼                    ▼
     [PostgreSQL + Prisma]     [Redis]  [Midtrans Snap]    [LLM API Engine]
     - users, products, carts   - Cache  - Snap Token &    - OpenAI / Gemini
     - orders, shippings        - Rate     Webhook Handler - Prompt Context
```

### Core API Integration Points
* **Authentication**: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh-token`
* **Catalog & Categories**: `GET /api/categories`, `GET /api/products?category=sneakers&sort=price_asc`
* **Cart & Inventory**: `POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`
* **Orders & Transaction**: `POST /api/orders/checkout` (ACID lock on inventory), `POST /api/payments/midtrans/webhook`
* **Chatbot Gateway**: `POST /api/chat/message` (HTTP Stream / Server-Sent Events) & `GET /api/chat/history`

### Security & Compliance
* **Data Isolation**: Token JWT disimpan pada *HttpOnly, Secure, SameSite=Strict Cookies* (Web) dan *Flutter Secure Storage* (Mobile).
* **Payment Security**: Verifikasi hash signature `SHA512(order_id + status_code + gross_amount + ServerKey)` pada setiap webhook Midtrans sebelum mutasi status pesanan.
* **Audit Trail**: Setiap mutasi stok dan eskalasi chat tercatat di tabel `audit_logs`.

---

## 5. Design System & Wireframe Spec (AI Design Ready)

> Bagian ini dirancang khusus agar dapat langsung dijadikan prompt untuk AI Design tool (seperti v0, Galileo AI, Figma AI, atau Lovable).

### Design Tokens
* **Color Palette**:
  * `Primary Accent`: `#1A56DB` (Electric Blue - seperti tombol *Shop Now* di UI)
  * `Primary Hover`: `#1E40AF`
  * `Background Base`: `#FFFFFF`
  * `Surface Muted`: `#F8FAFC` (Card background kategori)
  * `Text Headings`: `#0F172A` (Slate 900)
  * `Text Body`: `#475569` (Slate 600)
  * `Border Stroke`: `#E2E8F0`
  * `Success Badge`: `#10B981`
* **Typography**:
  * Headings: `Plus Jakarta Sans` / `Inter`, Bold (Font-weight: 700 / 800)
  * Body: `Inter`, Regular / Medium (Font-weight: 400 / 500)
* **Shape & Elevation**:
  * Card Corner Radius: `16px` (`rounded-2xl`)
  * Button Corner Radius: `9999px` (`rounded-full`) untuk Pill button
  * Floating Chat Button Radius: `9999px` dengan drop shadow `0 20px 25px -5px rgba(26, 86, 219, 0.25)`

### Wireframe Specifications by Screen

```
┌────────────────────────────────────────────────────────────────────────┐
│ [LOGO: NEXA]      Home   Shop   New Arrivals   Collections     [🔍] [🛒] [Login] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Step Into                              ┌─────────────────────────┐   │
│   Comfort & Style                        │  [Floating 3D Sneakers] │   │
│                                          │  High-performance blue  │   │
│   Discover our latest collection of      └─────────────────────────┘   │
│   shoes, crafted for modern fashion.                                   │
│                                                                        │
│   [ Shop Now -> ]    [ Explore More ]                                  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  [🚚 Free Delivery]   [🔄 Easy Returns]   [🔒 Secure]   [🎧 24/7 Support]  │
├────────────────────────────────────────────────────────────────────────┤
│  Kategori Pilihan                                        Lihat Semua ->│
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ [Sneakers]   │  │ [Formal]     │  │ [Boots]      │  │ [Heels/Flats]││
│  │ Sneakers &   │  │ Formal &     │  │ Boots        │  │ Heels & Flats││
│  │ Kasual       │  │ Dress Shoes  │  │              │  │              ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                                        │
│                                                            ┌─────────┐ │
│                                                            │ 💬 Chat │ │
│                                                            │ Widget  │ │
│                                                            └─────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Komponen Kunci Wireframe:
1. **Sticky Header Navbar**: Brand mark, Nav Links (`Home`, `Shop`, `New Arrivals`, `Collections`), Search Quick Modal, Cart Trigger dengan Counter Badge, dan Profile/Auth Button.
2. **Hero Stage**: Asymmetric grid dengan typography besar (`text-5xl` to `text-7xl`) dan Floating High-Resolution Rendered Shoe Asset dengan *soft ambient glow shadow*.
3. **Trust Value Bar**: 4 icon kolom dengan background pill transparan.
4. **Category Slider / Grid**: Card dengan background `#F8FAFC`, rasio gambar konsisten, label kategori centered di bawah gambar dengan *subtle hover zoom effect*.
5. **Floating Hybrid Chat Drawer**:
   * Minimized: Lingkaran 60x60px dengan badge status online hijau.
   * Expanded: Modal pop-over 380x560px dengan header bot, daftar pesan, pill tombol cepat (*"Cek Resi"*, *"Panduan Ukuran"*, *"Bicara dengan Tim CS"*), input box dan tombol kirim.

---

## 6. User Flow

```mermaid
flowchart TD
    A["Landing Page (Hero & Kategori)"] --> B{"Pilih Aksi"}
    B -->|Pilih Kategori / Produk| C["Halaman Katalog / Detail Produk"]
    B -->|Butuh Bantuan / Tanya| D["Buka Floating Chat Widget"]
    
    D --> E["Chat dengan AI Stylist & Bot"]
    E -->|Pertanyaan Terjawab| C
    E -->|Komplain / Butuh Manusia| F["Eskalasi ke Live Agent CS / WhatsApp"]
    
    C --> G["Pilih Varian Ukuran & Tambah ke Cart"]
    G --> H["Buka Cart Drawer / Checkout"]
    H --> I["Isi Alamat & Pilih Kurir Pengiriman"]
    I --> J["Pilih Metode Pembayaran (Midtrans Snap)"]
    J --> K{"Status Pembayaran"}
    K -->|Berhasil (Settlement)| L["Halaman Sukses & Resi Pesanan Dibuat"]
    K -->|Pending / Expired| M["Instruksi Bayar Ulang / Batal"]
    L --> N["Tracking Resi via Web, Mobile, atau AI Chatbot"]
```

---

## 7. Phased Roadmap & Technical Risks

| Phase | Milestone | Fokus Deliverables |
| :--- | :--- | :--- |
| **Phase 1 (MVP)** | **Core Storefront & Payment** | - Web Storefront (React) & Mobile (Flutter)<br>- Auth, Cart, Multi-variant shoes inventory<br>- Integrasi Midtrans Snap IDR (QRIS, VA, E-Wallet)<br>- Floating Chat Widget (Level 1: FAQ & Track Order rule-based) |
| **Phase 2 (v1.1)** | **AI Stylist & CS Handoff** | - Integrasi LLM (Gemini / OpenAI API) dengan Tool Calling DB pesanan<br>- Handoff system ke CS Admin Dashboard<br>- Push notification status pesanan di Flutter app |
| **Phase 3 (v2.0)** | **Semantic Discovery & Personalization** | - Semantic Search (Vector Embedding produk berdasarkan gaya/style query)<br>- AI Size Recommender berbasis input ukuran kaki (cm)<br>- Personalisasi feed rekomendasi berdasarkan riwayat klik user |

### Technical Risks & Mitigations
* **Race Condition Stok Terbatas (Flash Drop)**:
  * *Risiko*: Dua user checkout sepatu ukuran yang sama pada detik yang sama menyebabkan minus stock.
  * *Mitigasi*: Gunakan *Pessimistic Locking* atau `SELECT FOR UPDATE` di PostgreSQL lewat transaksi Prisma saat order dibuat.
* **Midtrans Webhook Idempotency**:
  * *Risiko*: Webhook Midtrans dikirim lebih dari sekali (*retry loop*), memicu duplicate status update.
  * *Mitigasi*: Cek status order sebelum update (`IF status == 'paid' THEN return HTTP 200 OK`).
* **AI Chat Latency**:
  * *Risiko*: Response time LLM lambat mengganggu pengalaman belanja.
  * *Mitigasi*: Terapkan streaming responses (SSE) dan pre-caching intent umum di Redis.

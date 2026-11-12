# 07. Reviews & Health Check API

Modul ini menyediakan endpoint ulasan produk (*customer reviews & ratings*) serta endpoint diagnostik kesehatan sistem (*health check probe*) untuk monitoring uptime server dan orkestrasi container Docker / Kubernetes.

---

## 1. Ambil Ulasan Produk Tertentu
Mengambil daftar ulasan, rating bintang (1-5), dan komentar pembeli untuk satu produk tertentu.

* **Method:** `GET`
* **URL:** `/api/products/:productId/reviews`
* **Auth:** Publik

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Reviews retrieved successfully",
  "payload": {
    "product_id": 1,
    "average_rating": 4.8,
    "total_reviews": 12,
    "reviews": [
      {
        "id": 5,
        "rating": 5,
        "comment": "Bahan katun tebal banget (400 GSM asli), sablonan grafis futuristiknya presisi!",
        "user_name": "Jane D.",
        "created_at": "2026-11-05T14:20:00.000Z"
      },
      {
        "id": 6,
        "rating": 4,
        "comment": "Cutting oversized-nya pas di badan, pengiriman JNE cepat.",
        "user_name": "Rizky A.",
        "created_at": "2026-11-06T09:12:00.000Z"
      }
    ]
  }
}
```

---

## 2. Berikan Ulasan Produk
Pelanggan memberikan rating bintang 1-5 dan komentar untuk produk yang telah dibeli.

* **Method:** `POST`
* **URL:** `/api/products/:productId/reviews`
* **Headers:** `Authorization: Bearer <accessToken>`

### Request Body:
```json
{
  "rating": 5,
  "comment": "Hoodie streetwear terbaik yang pernah saya beli di toko lokal. Recommended!"
}
```

### Response Success (`201 Created`):
```json
{
  "status": "success",
  "message": "Review created successfully",
  "payload": {
    "id": 7,
    "product_id": 1,
    "rating": 5,
    "comment": "Hoodie streetwear terbaik yang pernah saya beli di toko lokal. Recommended!",
    "created_at": "2026-11-12T05:30:00.000Z"
  }
}
```

---

## 3. System Health Check Probe
Endpoint diagnostik kesehatan server untuk memantau status operasional database PostgreSQL via Prisma, Redis in-memory cache, dan jejak memori Node.js (*Memory footprint*). Endpoint ini dikecualikan dari rate limiting dan autentikasi agar siap digunakan oleh Docker & Kubernetes liveness/readiness probes.

* **Method:** `GET`
* **URL:** `/api/health`
* **Auth:** Publik

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "System is healthy",
  "payload": {
    "uptime_seconds": 86400,
    "timestamp": "2026-11-12T05:30:00.000Z",
    "services": {
      "database": {
        "status": "UP",
        "latency_ms": 2.4
      },
      "redis": {
        "status": "UP",
        "latency_ms": 0.8
      }
    },
    "memory": {
      "heap_used_mb": 48.2,
      "heap_total_mb": 62.5,
      "rss_mb": 94.1
    }
  }
}
```

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Endpoint review produk dengan aggregasi rating bintang (1-5) dan komentar pelanggan.
* Endpoint diagnostik `/api/health` yang menguji konektivitas real-time ke PostgreSQL via Prisma, Redis latency, uptime sistem, dan konsumsi memori heap Node.js tanpa terhambat rate limiter (Docker/K8s ready).

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Verified Buyer Enforcement (Anti-Fake Reviews):**  
   Saat ini endpoint pembuatan review belum memverifikasi secara ketat apakah akun yang menulis ulasan benar-benar memiliki riwayat pesanan produk tersebut yang berstatus `COMPLETED`. Batasan mentoknya adalah menolak review jika user belum pernah menyelesaikan pembelian produk terkait.
2. **Review Photo/Video Upload:**  
   Pelanggan belum bisa mengunggah foto atau video unboxing pakaian asli untuk ulasan produk. Batasan mentoknya membutuhkan integrasi upload gambar review WebP (maksimal 3 foto).
3. **Helpful Vote & Admin Official Reply:**  
   Belum ada fitur komunitas tombol *"Membantu (Helpful)"* pada komentar ulasan untuk menaikkan review paling bermanfaat ke posisi atas, serta belum ada fitur balasan resmi (*Store Owner Reply*) dari admin toko.
4. **Prometheus Metrics Endpoint (`/api/metrics`):**  
   Untuk monitoring observabilitas level production skala besar, batasan mentoknya menambahkan endpoint scraping Prometheus metrics (menggunakan `prom-client`) yang mencatat histogram HTTP request duration, event loop lag, dan active DB pool connections untuk divisualisasikan di Grafana.

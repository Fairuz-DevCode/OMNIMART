# 10. DDoS Attack Mitigation & Traffic Management

## 1. Masalah yang Terjadi (Vulnerability Anatomy & Attack Layers)

**DDoS (Distributed Denial of Service)** adalah serangan siber di mana penyerang mengarahkan ribuan hingga jutaan komputer / bot yang terinfeksi (*botnet*) untuk membanjiri server toko online secara bersamaan, dengan tujuan melumpuhkan server sehingga pelanggan asli tidak bisa berbelanja (*system blackout*).

```mermaid
flowchart TD
    Botnet["Botnet Ribuan Komputer / IoT<br/>(Banjir Trafik Jutaan Request)"]
    
    Botnet -->|Layer 3/4: SYN Flood / UDP Amplification (50 Gbps)| Edge["Pilar 1: Edge CDN / Anycast Scrubbing<br/>(Cloudflare / AWS Shield)"]
    Edge -->|Lolos ke Reverse Proxy (Layer 7 HTTP Flood)| Nginx["Pilar 2: Ingress Nginx / Load Balancer<br/>(Connection Limits & KeepAlive)"]
    Nginx -->|Trafik Terfilter Masuk ke Backend| Node["Pilar 3: Nexa Express Server<br/>(TCP Socket Timeouts & 1MB Body Limit)"]
    Node -->|Offload Bebas Query Berat| Cache["Pilar 4: Redis In-Memory Cache<br/>& DB Pool Fast-Fail"]

    style Botnet fill:#ffdddd,stroke:#d9534f
    style Edge fill:#e1f5fe,stroke:#0288d1
    style Nginx fill:#fff8e1,stroke:#fbc02d
    style Node fill:#e8f5e9,stroke:#388e3c
    style Cache fill:#ede7f6,stroke:#512da8
```

### Dua Kategori Serangan DDoS:

| Kategori | Layer 3 & 4 (Network & Transport DDoS) | Layer 7 (Application DDoS) |
|:---|:---|:---|
| **Contoh Serangan** | SYN Flood, UDP Flood, NTP/DNS Amplification. | HTTP GET/POST Flood, Slowloris, Large Body OOM, Cache-Bypass Query Storms. |
| **Volume Serangan** | Puluhan hingga ratusan Gigabits per detik (Gbps). | Ribuan hingga ratusan ribu request HTTP per detik (RPS). |
| **Metode Penanganan** | **Wajib di Edge / Cloud CDN** (Cloudflare / AWS Shield). Kode Node.js tidak boleh dan tidak sanggup menerima bandwidth ini secara langsung. | Ditangani secara kolaboratif oleh **Reverse Proxy (Nginx) + Arsitektur Kode Aplikasi (Express & Redis)**. |

---

## 2. Solusi Best Practice (Arsitektur 4 Pilar Penangkalan DDoS)

Project **Nexa Streetwear** menerapkan strategi pertahanan terkoordinasi dari level jaringan hingga database:

### Pilar 1: Edge Cloud Scrubbing (Layer 3/4 Defense)
Lalu lintas domain publik dilindungi oleh jaringan Anycast Global (seperti Cloudflare). Seluruh banjir paket SYN/UDP diserap dan dibersihkan (*scrubbed*) di data center terdekat sebelum mencapai server origin kita.

### Pilar 2: Reverse Proxy & Nginx Ingress (Slowloris & Connection Limiter)
Nginx atau Cloudflare Ingress dikonfigurasi untuk membatasi jumlah koneksi serentak per IP dan menutup koneksi lambat yang sengaja menggantung (*Slowloris attack*).

### Pilar 3: Socket Timeouts & Resource Protection (Node.js Level)
* **Anti-Slowloris Socket Timeouts:** Membatasi waktu pembacaan header (`headersTimeout`) dan membatasi waktu hidup koneksi idle (`keepAliveTimeout`).
* **Payload Size Limits (1MB):** Menolak body JSON raksasa yang sengaja dikirim penyerang untuk memicu kebocoran memori (*Heap Out-Of-Memory / OOM crash*).
* **HTTP Parameter Pollution (HPP) Defense:** Membersihkan polusi array duplikat pada query string menggunakan `hpp()`.
* **Global Request Timeout (15 Detik):** Memutus paksa request yang menggantung jika terjadi query lambat atau kegagalan downstream API.

### Pilar 4: Database Offloading & Pool Fast-Fail (PostgreSQL & Redis)
* **Redis Caching:** Rute katalog produk di-cache selama 10 menit. Jutaan request pencarian produk diserap oleh Redis (<1ms) tanpa menyentuh PostgreSQL.
* **Pool Fast-Fail (5 Detik):** Jika kolam koneksi database penuh, aplikasi langsung gagal dengan cepat (*fast-fail*) dalam 5 detik alih-alih membiarkan worker thread Node.js menggantung tanpa batas.

---

## 3. Implementasi Nyata di Codebase Project

### A. Anti-Slowloris TCP Socket Timeouts di [`backend/src/server.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L12-L17)

Penyerang Slowloris membuka ribuan koneksi dan mengirim header byte demi byte secara sangat lambat untuk menghabiskan pool koneksi server. Di `server.ts`, kita mengunci batas waktu soket secara ketat:

```typescript
// backend/src/server.ts
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Anti-Slowloris & Connection Starvation Hardening (TCP/HTTP Socket Level)
// Nilai keepAliveTimeout diset 65s (lebih besar dari timeout standar 60s pada Nginx / AWS ALB)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000; // Memutus koneksi jika pengiriman header sengaja diperlambat
server.requestTimeout = 30000; // Batas mutlak pembacaan request di level TCP socket (30 detik)
```

---

### B. Global Request Timeout Guard di [`backend/src/middleware/timeoutMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/timeoutMiddleware.ts)

Memutus request yang menggantung dan mengembalikan status `HTTP 504 Gateway Timeout` jika durasi melebihi 15 detik:

```typescript
// backend/src/middleware/timeoutMiddleware.ts
export const requestTimeout = (timeoutMs: number = 15000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(new AppError("Request timed out. Please try again later.", 504));
      }
    }, timeoutMs);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  };
};
```

Dipasang secara global di [`backend/src/app.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts#L141):
```typescript
app.use(requestTimeout(15000));
```

---

### C. Pembatasan Payload & Polusi Parameter di [`backend/src/app.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts#L134-L136)

```typescript
// backend/src/app.ts
// Membatasi ukuran body maksimal 1MB untuk menangkal buffer overflow DoS
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Menangkal serangan manipulasi parameter ganda (contoh: ?id=1&id=2)
app.use(hpp());

// Menangkap error jika penyerang sengaja mengirimkan JSON rusak (malformed)
app.use(handleJsonSyntaxError);
```

---

### D. Multi-Tier Traffic Shaping (Throttling + Rate Limit) di [`backend/src/app.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts#L48-L65)

* **`speedLimiter` (Soft Throttling):** Memperlambat respons 500ms s/d 20 detik secara bertahap saat request melebihi 50/15m.
* **`globalApiLimiter`:** Memotong request total di atas 150/15m dengan `HTTP 429 Too Many Requests`.
* **`authLimiter`:** Mengunci form login jika ada lebih dari 15 percobaan/15m.

---

### E. Database Connection Pool Protection di [`backend/src/config/db.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/db.ts#L10-L16)

```typescript
// backend/src/config/db.ts
const pool = new Pool({
  ...
  max: 20, // Maksimal 20 koneksi bersamaan (mencegah OOM di database)
  idleTimeoutMillis: 30000, // Tutup koneksi idle setelah 30 detik
  connectionTimeoutMillis: 5000, // Gagal cepat dalam 5 detik jika antrian pool penuh
});
```

---

## 4. Konfigurasi Nginx Ingress untuk DDoS Mitigation (Production Snippet)

Pada server Linux production, pasang konfigurasi Nginx rate-limiting dan buffer timeouts berikut:

```nginx
# /etc/nginx/nginx.conf

# 1. Definisi Zona Rate Limiting (Maksimal 30 request/detik per IP)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

server {
    listen 443 ssl http2;
    server_name api.nexa.com;

    # 2. Batasi Jumlah Koneksi Simultan per IP (Maksimal 20 koneksi per IP)
    limit_conn conn_limit 20;

    # 3. Anti-Slowloris Timeouts di Level Nginx
    client_body_timeout 10s;
    client_header_timeout 10s;
    keepalive_timeout 65s;
    send_timeout 10s;

    # 4. Batas Maksimal Upload Body Nginx
    client_max_body_size 5M;

    location /api/ {
        # Terapkan rate limit dengan burst 20 request tanpa delay
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 5. Developer DDoS Mitigation Checklist

- [x] **Layer 3/4 Offloading:** Arsitektur siap berada di balik Cloudflare / CDN Reverse Proxy.
- [x] **Socket Timeouts (Anti-Slowloris):** `keepAliveTimeout` (65s), `headersTimeout` (66s), dan `requestTimeout` (30s) terkonfigurasi di `server.ts`.
- [x] **Application Request Timeout:** Middleware `requestTimeout(15000)` aktif memutus eksekusi query yang menggantung di atas 15 detik.
- [x] **Payload Size Ceiling:** Express membatasi body parser maksimal 1MB untuk mencegah kehabisan heap memory.
- [x] **Parameter Pollution Guard:** `hpp()` aktif membersihkan duplikasi array parameter.
- [x] **Database Fast-Fail:** Pool PostgreSQL disetel maksimal 20 koneksi dengan `connectionTimeoutMillis: 5000` agar tidak memblokir antrian server.
- [x] **In-Memory Caching:** Rute katalog dan kategori membaca dari Redis (`cacheResponse(600)`), mengisolasi database utama dari banjir pembacaan data.

---

## 6. Evaluasi & Gap Analysis Standar Industri (Batasan Mentok)

Sebagai Senior Backend Engineer, berikut adalah hasil audit mendalam terhadap ketahanan arsitektur aplikasi dalam menghadapi serangan DDoS volumetrik maupun aplikasi Layer-7 dibanding standar tier-1 marketplace:

### A. Komponen yang Sudah Teruji & Solid (Production-Ready)
1. **Anti-Slowloris Socket Tightening:** Penyesuaian `keepAliveTimeout` (65s), `headersTimeout` (66s), dan `requestTimeout` (30s) telah mengamankan layer soket TCP Node.js dari teknik connection starvation.
2. **Global Application Timeout (15s):** Pemutusan paksa via middleware timeout mencegah thread pool Express macet akibat query database atau upstream fetch yang menggantung.
3. **Multi-Layer Defensive Offloading:** Integrasi Redis in-memory cache dan koneksi fast-fail PostgreSQL (5s) berhasil mengisolasi database dari lonjakan request katalog produk.

### B. Gap Analysis: Hal yang Belum Diterapkan Menuju "Batasan Mentok"

| Pilar Mitigasi DDoS & Stabilitas | Kondisi Saat Ini di Codebase | Standar Batasan Mentok (Enterprise Grade) | Dampak & Urgensi |
| :--- | :--- | :--- | :--- |
| **Adaptive Load Shedding (Overload Protection)** | Server menerima request secara membabi-buta hingga CPU 100% atau RAM OOM crash. | Menerapkan middleware **Load Shedding** (memantau Event Loop Lag & RSS Memory). Jika lag > 100ms, server otomatis menolak request non-kritis dengan `503 Service Unavailable`. | **Tinggi (P1):** Pada saat flash sale kolaborasi streetwear masif, server lebih baik mengorbankan traffic browsing katalog daripada membiarkan proses pembayaran checkout nasabah yang sedang berlangsung ikut gugur (*cascading failure*). |
| **Circuit Breaker Pattern (Resilience)** | Koneksi ke gateway eksternal (Midtrans, RajaOngkir) dieksekusi langsung tanpa pemutus sirkuit otomatis. | Menggunakan library Circuit Breaker (seperti `opossum`) dengan status *Closed $\to$ Open $\to$ Half-Open* jika third-party API mengalami failure rate > 50%. | **Tinggi (P1):** Jika server Midtrans atau RajaOngkir lambat (timeout 10 detik), ratusan request user yang checkout akan menumpuk di memori Express dan melumpuhkan seluruh server toko. |
| **Automated Edge Cloudflare Sync (Edge Banning)** | Blokir IP hanya dilakukan di memori Redis lokal via rate limiter Node.js. | Integrasi otomatis via Cloudflare API v4: IP yang melanggar limit brutal langsung di-push ke Cloudflare WAF Block Rule secara terprogram. | **Sedang (P2):** Trafik jahat dicegat sebelum memakan bandwidth VPS dan tanpa mengonsumsi resource CPU Node.js sedikit pun. |
| **Geo-IP Fencing & AS-Number Blocking** | Menerima trafik dari seluruh dunia tanpa penyaringan geografis. | Di level CDN Edge/WAF, rute mutasi dan checkout hanya diizinkan untuk trafik dari regional target pasar (Indonesia & Asia Tenggara), memblokir IP dari negara sumber botnet umum. | **Sedang (P2):** Mengeliminasi lebih dari 80% serangan scanning bot liar dari internet publik. |
| **Graceful Connection Draining** | Saat proses restart atau redeploy, server langsung mematikan listener soket HTTP. | Menerapkan *Graceful Shutdown Handler* (`SIGTERM`/`SIGINT`) yang menunggu request berjalan selesai diproses (maksimal 30 detik) sebelum menutup pool database dan proses Node.js. | **Rendah (P3):** Mencegah transaksi checkout pelanggan terputus di tengah jalan saat proses deployment versi baru berlangsung. |

### C. Rekomendasi Roadmap Implementasi
1. **Prioritas Terdekat (Graceful Shutdown Handler):** Tambahkan listener `process.on('SIGTERM')` di [`backend/src/server.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts) untuk menutup koneksi pool PostgreSQL dan Redis secara bersih.
2. **Prioritas Menengah (Circuit Breaker Third-Party):** Bungkus integrasi API payment gateway Midtrans dan RajaOngkir dengan wrapper Circuit Breaker agar kegagalan pihak ketiga tidak merambat ke sistem internal.

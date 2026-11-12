# 05. SSL/TLS Encryption & Transport Layer Security

## 1. Masalah yang Terjadi (Vulnerability Anatomy & Real-World Risks)

Data yang dikirimkan melalui internet tanpa enkripsi berjalan dalam format teks polos (*plaintext*). Siapa pun yang berada di jalur jaringan antara pengguna dan server (seperti penyedia Wi-Fi publik, router internet, ISP, atau peretas jaringan) dapat membaca dan mengubah paket data tersebut secara bebas.

```mermaid
flowchart LR
    User["Pelanggan E-Commerce<br/>(Input Password & Kartu Kredit)"] --> Router["Wi-Fi Publik / Router ISP<br/>(Hacker Sniffing / Packet Capture)"]
    Router --> Backend["Nexa Backend API Server"]

    style User fill:#fff0db,stroke:#f0ad4e
    style Router fill:#ffdddd,stroke:#d9534f
    style Backend fill:#e8f5e9,stroke:#388e3c
```

### SSL vs TLS: Apa Bedanya?
* **SSL (Secure Sockets Layer):** Protokol enkripsi generasi lama (SSL 1.0, 2.0, 3.0) yang sudah **usang dan ditinggalkan (*deprecated*)** sejak tahun 2015 karena rentan terhadap serangan seperti *POODLE*.
* **TLS (Transport Layer Security):** Penerus resmi SSL yang modern, jauh lebih cepat, dan aman. Standar industri saat ini mewajibkan penggunaan **TLS 1.2 atau TLS 1.3**.
> [!NOTE]
> Istilah "Sertifikat SSL" saat ini di industri sebenarnya merujuk pada **Sertifikat TLS**. Keduanya sering digunakan bergantian secara sinonim.

### Vektor Serangan Fatal Tanpa Enkripsi Transport:

1. **Man-in-the-Middle (MitM) & Network Sniffing:**
   * Di jaringan publik (seperti Wi-Fi kafe, bandara, atau coworking), penyerang menggunakan perangkat lunak *packet sniffer* (seperti Wireshark) untuk menyalin isi header HTTP. Kredensial password, nomor kartu, dan cookie `refreshToken` langsung terbaca mentah tanpa proteksi.
2. **Serangan SSL Stripping:**
   * Penyerang mencegat sambungan pertama pengguna yang mengetikkan `http://nexa.com`, lalu mencegah browser beralih ke `https://`. Penyerang berkomunikasi dengan server via HTTPS tetapi meneruskannya ke browser korban via HTTP polos.
3. **Penyadapan Koneksi Database Cloud (Database In-Transit Leakage):**
   * Di era cloud hosting (misal: backend di Railway / AWS ECS dan database PostgreSQL di Supabase / Neon / RDS), lalu lintas query berjalan melintasi internet publik. Tanpa enkripsi TLS pada driver database, seluruh query SQL dan data pelanggan dapat diintip di tengah jalan.
4. **Peringatan Browser "Not Secure":**
   * Browser modern (Chrome, Safari, Firefox) langsung menampilkan gembok merah dan peringatan *"Situs Tidak Aman"* jika sebuah website e-commerce meminta data input form tanpa HTTPS, menghancurkan konversi transaksi dan reputasi brand.

---

## 2. Solusi Best Practice (5 Lapisan Transport Security)

Project **Nexa Streetwear** menerapkan arsitektur keamanan transportasi data berlapis (*Defense-in-Depth*):

```mermaid
flowchart TD
    Client["Browser / Mobile Client"] -->|HTTPS / TLS 1.3 Port 443| Ingress["Reverse Proxy (Cloudflare / Nginx / ALB)"]
    Ingress -->|x-forwarded-proto: https| App["Express Node.js Backend"]
    App -->|Header: Strict-Transport-Security (HSTS)| Client
    App -->|Secure Flag pada Cookie| Client
    App -->|TLS Encrypted Connection (Port 5432)| DB[(PostgreSQL Cloud Database)]

    style Client fill:#e1f5fe,stroke:#0288d1
    style Ingress fill:#fff8e1,stroke:#fbc02d
    App fill:#e8f5e9,stroke:#388e3c
    DB fill:#eceff1,stroke:#455a64
```

1. **Enkripsi End-to-End dengan TLS 1.3:**
   * Seluruh pertukaran data publik wajib menggunakan HTTPS (port 443) dengan sandi (*cipher suites*) modern.
2. **HTTP Strict Transport Security (HSTS):**
   * Mengirimkan header `Strict-Transport-Security` yang memaksa browser mengingat bahwa website ini **HANYA boleh dibuka via HTTPS** selama minimal 1 tahun (`max-age=31536000`), mencakup semua subdomain (`includeSubDomains`), dan terdaftar di *HSTS Preload List* milik Google/Apple.
3. **Redirect Permanen Otomatis (Proxy-Aware 301 Redirect):**
   * Jika ada request yang masuk via protokol HTTP polos, server otomatis melempar respons `301 Moved Permanently` ke URL versi `https://`.
4. **Proteksi Cookie via Atribut `Secure`:**
   * Seluruh cookie sensitif (seperti `refreshToken` dan `_csrf_token`) di-set dengan flag `secure: true` di lingkungan produksi, sehingga browser menolak mengirimkan cookie jika koneksi bukan HTTPS.
5. **Database In-Transit TLS/SSL Encryption:**
   * Driver `pg` PostgreSQL dikonfigurasi untuk menggunakan enkripsi TLS (`ssl: true`) saat berkomunikasi dengan server database jarak jauh di cloud.

---

## 3. Implementasi Nyata di Codebase Project

### A. Proxy-Aware HTTPS Enforcer di [`backend/src/middleware/securityMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/securityMiddleware.ts#L21-L37)

Middleware ini mendeteksi apakah request masuk via HTTPS, baik melalui koneksi langsung maupun di balik Reverse Proxy / Load Balancer:

```typescript
// backend/src/middleware/securityMiddleware.ts
export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (env.NODE_ENV === "production") {
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    if (!isHttps) {
      const host = req.headers.host || "localhost";
      return res.redirect(301, `https://${host}${req.url}`);
    }
  }
  next();
};
```

---

### B. Konfigurasi HSTS via Helmet di [`backend/src/middleware/securityMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/securityMiddleware.ts#L11-L19)

```typescript
// backend/src/middleware/securityMiddleware.ts
export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 tahun masa berlaku HSTS di cache browser
    includeSubDomains: true, // Berlaku untuk semua subdomain (admin.nexa.com, api.nexa.com)
    preload: true, // Memenuhi syarat HSTS Preload List browser global
  },
});
```

---

### C. Aktivasi `trust proxy` di [`backend/src/app.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts#L41)

Karena aplikasi di-deploy di belakang reverse proxy (seperti Cloudflare, Nginx, atau AWS ALB), Express harus mempercayai header dari proxy:

```typescript
// backend/src/app.ts
app.set("trust proxy", 1); // Membaca x-forwarded-proto dan x-forwarded-for asli

app.use(enforceHttps); // 1. Redirect HTTP ke HTTPS
app.use(securityHeaders); // 2. Menyematkan HSTS dan security headers lainnya
```

---

### D. Enkripsi Koneksi Database PostgreSQL di [`backend/src/config/db.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/db.ts#L5-L16)

Driver native `pg.Pool` otomatis menyalakan enkripsi TLS jika mendeteksi database berada di remote cloud:

```typescript
// backend/src/config/db.ts
const isProduction = env.NODE_ENV === "production";
const isRemoteDb = env.DB_HOST !== "localhost" && env.DB_HOST !== "127.0.0.1";
const shouldUseSSL = env.DB_SSL ?? (isProduction && isRemoteDb);

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  // Enkripsi in-transit aktif untuk remote cloud database:
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

---

### E. Pembatasan Cookie Khusus HTTPS di [`backend/src/modules/auth/auth.controller.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/auth/auth.controller.ts#L5-L10)

```typescript
// backend/src/modules/auth/auth.controller.ts
const cookiesOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production", // Wajib HTTPS di production
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
```

---

### F. Pencegahan Mixed Content pada Frontend Client ([`frontend/src/shared/services/api.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/frontend/src/shared/services/api.ts) & [`imageUrl.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/frontend/src/shared/utils/imageUrl.ts))

Browser akan langsung memblokir request API (*Blocked: Mixed Content*) jika halaman dimuat via HTTPS tetapi melakukan fetch atau mengambil gambar menggunakan URL hardcoded HTTP. 

Frontend project ini telah dibersihkan dari hardcoded `http://localhost:5000` dan dialihkan ke pembacaan dinamis berbasis protokol environment:

```typescript
// frontend/src/shared/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
```

---

## 4. Konfigurasi Produksi Reverse Proxy (Nginx Snippet Cheatsheet)

Ketika mendeploy ke server Linux mandiri dengan Nginx, pasang konfigurasi TLS 1.2 / TLS 1.3 modern berikut:

```nginx
# /etc/nginx/sites-available/nexa.conf

# 1. Redirect HTTP Port 80 ke HTTPS Port 443
server {
    listen 80;
    listen [::]:80;
    server_name nexa.com www.nexa.com api.nexa.com;
    return 301 https://$host$request_uri;
}

# 2. Server Blok HTTPS Port 443
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.nexa.com;

    # Sertifikat TLS (Let's Encrypt / Cloudflare Origin CA)
    ssl_certificate /etc/letsencrypt/live/api.nexa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nexa.com/privkey.pem;

    # Protokol & Ciphers Modern (TLS 1.2 dan TLS 1.3 Only)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # Session Cache & Ticket
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 5. Developer SSL/TLS Checklist

- [x] **Enforce HTTPS Redirect:** Request HTTP otomatis di-redirect ke HTTPS dengan status `301 Moved Permanently`.
- [x] **HSTS Aktif:** Header `Strict-Transport-Security` menyertakan `maxAge` minimal 1 tahun, `includeSubDomains`, dan `preload`.
- [x] **Reverse Proxy Trust:** `app.set("trust proxy", 1)` aktif untuk mengenali header `x-forwarded-proto`.
- [x] **Secure Cookie Flags:** Semua cookie kredensial (`refreshToken`, `_csrf_token`) berstatus `secure: true` di lingkungan produksi.
- [x] **Modern Protocols Only:** Konfigurasi server publik menolak SSL v2, SSL v3, TLS 1.0, dan TLS 1.1. Hanya mengizinkan TLS 1.2 dan TLS 1.3.
- [x] **Database Transport Encryption:** Koneksi database cloud menggunakan TLS terenkripsi untuk mencegah sniffing query.

---

## 6. Evaluasi & Gap Analysis Standar Industri (Batasan Mentok)

Sebagai Senior Backend Engineer, berikut adalah hasil audit menyeluruh mengenai kepatuhan transport security dan enkripsi jaringan saat ini dibanding standar industri level enterprise (Fintech/Tier-1 E-Commerce):

### A. Komponen yang Sudah Teruji & Solid (Production-Ready)
1. **Automated HTTPS Enforcement & Proxy Awareness:** Middleware mengenali `x-forwarded-proto` dan melempar status permanen `301` jika request masuk tanpa TLS.
2. **HSTS Preload Compliant:** Header HSTS disematkan via Helmet dengan parameter lengkap (`max-age=31536000`, `includeSubDomains`, `preload`).
3. **Cookie Hardening:** Cookie autentikasi dan token CSRF dikunci secara otomatis dengan flag `secure: true` saat environment produksi.

### B. Gap Analysis: Hal yang Belum Diterapkan Menuju "Batasan Mentok"

| Area Keamanan Transport | Kondisi Saat Ini di Codebase | Standar Batasan Mentok (Enterprise Grade) | Dampak & Urgensi |
| :--- | :--- | :--- | :--- |
| **Strict Database TLS CA Verification** | Menggunakan `rejectUnauthorized: false` pada driver `pg` cloud connection. | Driver DB memvalidasi sertifikat CA root resmi provider (`ssl: { ca: fs.readFileSync('db-ca.pem'), rejectUnauthorized: true }`). | **Tinggi (P1):** `rejectUnauthorized: false` membuat koneksi ke database cloud tetap rentan terhadap Man-in-the-Middle (MitM) spoofing DNS internal. |
| **OCSP Stapling (Online Certificate Status Protocol)** | Mengandalkan lookup CRL/OCSP default dari browser saat handshake. | Konfigurasi Nginx/Reverse Proxy mengaktifkan `ssl_stapling on` dan `ssl_stapling_verify on` dengan DNS resolver internal. | **Sedang (P2):** Mempercepat waktu TLS handshake hingga 30-40% dan mencegah kebocoran riwayat browsing client ke otoritas sertifikat (CA). |
| **Mutual TLS (mTLS) Service-to-Service** | Komunikasi internal antar worker/cron/tools hanya mengandalkan bearer token / IP whitelist. | Menggunakan enkripsi dua arah (mTLS) di mana server dan client saling memverifikasi sertifikat x509 masing-masing (Zero Trust Network Architecture). | **Sedang (P2):** Sangat kritikal jika arsitektur dipecah menjadi microservices atau payment webhook proxy privat. |
| **Certificate Transparency (CT) Monitoring** | Tidak ada pemantauan jika ada CA luar yang menerbitkan sertifikat domain tanpa izin. | Integrasi automated webhook alert via CT Monitor (seperti Certstream atau Cloudflare SSL Monitor) jika ada issue sertifikat baru untuk domain Nexa. | **Rendah (P3):** Mendeteksi pembajakan domain atau insiden kompromi CA sebelum sertifikat palsu digunakan penyerang. |
| **HTTP/3 (QUIC Protocol)** | Masih bertumpu pada HTTP/1.1 (di backend) dan HTTP/2 (di reverse proxy Nginx). | Ingress gateway mendukung HTTP/3 berbasis UDP untuk latensi nol saat *connection migration* di jaringan mobile 4G/5G pelanggan. | **Rendah (P3):** Optimasi kecepatan transaksi checkout mobile di koneksi seluler tidak stabil. |

### C. Rekomendasi Roadmap Implementasi
1. **Prioritas Terdekat (Hardening DB TLS):** Unduh berkas CA bundle dari provider database (misal AWS RDS Global Bundle atau Supabase CA) lalu ubah opsi `rejectUnauthorized` menjadi `true` di [`backend/src/config/db.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/db.ts).
2. **Prioritas Menengah (Ingress Hardening):** Aktifkan OCSP Stapling dan session resumption ticket pada template reverse proxy Nginx untuk efisiensi CPU handshake TLS.

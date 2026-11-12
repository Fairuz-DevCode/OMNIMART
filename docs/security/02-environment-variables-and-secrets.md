# 02. Environment Variables & Secrets Management

## 1. Masalah yang Terjadi (Vulnerability Anatomy & Real-World Risks)

Di dalam standar produksi modern (*The Twelve-Factor App*, *OWASP Secrets Management*, dan *CIS Benchmarks*), poin **"Variables"** merujuk pada tata kelola **Environment Variables & Kredensial Sensitif (Secrets)**.

Celah keamanan terkait variabel konfigurasi merupakan salah satu penyebab kebocoran data (*data breach*) terbesar di dunia:

```mermaid
flowchart LR
    A["Developer Menulis Kunci di Code<br/>(Hardcoded Secrets)"] --> B["Git Commit & Push<br/>ke Repository"]
    B --> C["Bot Scraper Publik<br/>(Mendeteksi Kunci dalam Detik)"]
    C --> D["Eksploitasi Kredensial<br/>(Database Bobol, Token Palsu, Tagihan Jebol)"]

    style A fill:#ffdddd,stroke:#d9534f
    style B fill:#fff0db,stroke:#f0ad4e
    style C fill:#f9f9f9,stroke:#333
    style D fill:#f2dede,stroke:#a94442
```

### Vektor Serangan Nyata pada E-Commerce:

1. **Pemalsuan Token JWT (Token Forgery Attack):**
   * Jika kunci `JWT_ACCESS_SECRET` pendek (misal hanya 8 karakter seperti `"secret12"`) atau menggunakan nilai default (*dummy string*), penyerang dapat melakukan serangan *offline dictionary attack* atau *brute-force* menggunakan GPU. Begitu kunci ditemukan, penyerang dapat mencetak JWT palsu dengan peran `role: "admin"` dan mengambil alih seluruh toko.
2. **Database Tanpa Password di Production:**
   * Jika aplikasi mengizinkan nilai default kosong (`DB_PASSWORD=""`), saat container atau server di-deploy ke cloud dengan port 5432 terbuka, database langsung bisa diakses oleh bot peretas tanpa otentikasi.
3. **Bypass Validasi via Fallback Sembarangan:**
   * Menggunakan pola `process.env.MIDTRANS_SERVER_KEY || "placeholder"` membuat aplikasi tampak berjalan normal saat startup, namun saat pelanggan membayar, transaksi gagal atau bahkan diverifikasi dengan kunci dummy yang tidak sah.
4. **Kebocoran Rahasia melalui Response Error HTTP (Information Disclosure):**
   * Saat PostgreSQL gagal terkoneksi, pesan error bawaan driver memuat connection string lengkap (`postgresql://user:password@host/db`). Mengembalikan `err.message` mentah ke response HTTP 500 akan membocorkan password database kepada pengguna umum.
5. **Polusi Variabel Frontend (Client-Side Exposure):**
   * Variabel yang di-bundle oleh compiler frontend (seperti prefix `VITE_` pada Vite/React) akan di-*embed* langsung ke file JavaScript publik browser. Jika developer salah menaruh `VITE_DB_PASSWORD`, password tersebut bisa dibaca oleh siapapun melalui Inspect Element browser.

---

## 2. Solusi Best Practice (Defense-in-Depth)

Untuk mengamankan variabel konfigurasi dan kredensial aplikasi, project ini menerapkan 5 pilar pertahanan:

```mermaid
flowchart TD
    OS["Environment OS / Docker (.env)"] --> Boot["Booting Aplikasi (Startup)"]
    Boot --> Zod["Zod Fail-Fast Schema Validation<br/>(backend/src/config/env.ts)"]
    Zod -->|Ada Kunci Kurang / Lemah / Salah Format| Stop["process.exit(1)<br/>Server Berhenti Seketika"]
    Zod -->|Lolos Validasi & Hardening| Singleton["Type-Safe Immutable Singleton<br/>(export const env)"]
    Singleton --> Services["Database, Redis, Midtrans, Express Modules"]

    style Zod fill:#e1f5fe,stroke:#0288d1
    style Singleton fill:#e8f5e9,stroke:#388e3c
    style Stop fill:#ffebee,stroke:#d32f2f
    style Services fill:#ede7f6,stroke:#512da8
```

1. **The 12-Factor App (Factor III - Store Config in the Environment):**
   * Pemisahan total antara kode sumber (*code base*) dengan konfigurasi (*environment*). Kode aplikasi harus bisa dijadikan *open source* kapan saja tanpa khawatir membocorkan password.
2. **Fail-Fast Startup Validation:**
   * Validasi seluruh tipe data dan keberadaan variabel saat proses booting pertama kali. Jika ada variabel penting yang hilang, aplikasi harus langsung berhenti (*crash early*) sebelum menerima request HTTP pertama.
3. **Kekuatan Kriptografi Sesuai Standar RFC 7518 & OWASP:**
   * Algoritma HMAC-SHA256 (HS256) mewajibkan kunci dengan entropi minimal **256-bit (32 karakter acak)**.
4. **Isolasi Git Ketat (.gitignore Quarantine):**
   * File `.env` dilarang keras di-commit ke Git. Hanya file contoh template dummy [`backend/.env.example`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/.env.example) yang boleh masuk ke repository.
5. **Zero Raw `process.env` Direct Access (Anti-Bypass):**
   * Seluruh modul dilarang memanggil `process.env.*` secara acak. Seluruh variabel wajib diakses melalui singleton `env` yang telah tervalidasi dan bertipe data pasti (*type-safe*).

---

## 3. Implementasi Nyata di Codebase Project Ini

Project **Nexa Streetwear** menerapkan standardisasi variabel tingkat produksi (*enterprise-grade*) berikut:

### Pilar 1: Skema Validasi Ketat & Fail-Fast di [`backend/src/config/env.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/env.ts)

Seluruh variabel environment divalidasi dengan Zod:
```typescript
// backend/src/config/env.ts
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
  
  // Database configuration
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.string().default("5432").transform((val) => parseInt(val, 10)),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().default(""),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required for Prisma"),

  // JWT Secrets (Wajib minimal 32 karakter untuk standar kriptografi HS256)
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters long for cryptographic security"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters long for cryptographic security"),

  CLIENT_URL: z.string().default("http://localhost:5173"),
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_IS_PRODUCTION: z.string().optional().transform((val) => val === "true"),
});
```

---

### Pilar 2: Aturan Pengetatan Khusus Lingkungan Produksi (`superRefine`)

Di [`backend/src/config/env.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/env.ts#L48-L98), ditambahkan guard `superRefine` agar nilai default lokal tidak bisa lolos saat `NODE_ENV === "production"`:

```typescript
// backend/src/config/env.ts
.superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    // 1. Password database dilarang kosong di production
    if (!data.DB_PASSWORD || data.DB_PASSWORD.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DB_PASSWORD"],
        message: "DB_PASSWORD cannot be empty in production environment",
      });
    }

    // 2. Client URL wajib menggunakan protokol HTTPS terenkripsi
    if (!data.CLIENT_URL.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLIENT_URL"],
        message: "CLIENT_URL must use HTTPS protocol in production",
      });
    }

    // 3. Larangan mutlak menggunakan kata dummy / placeholder pada JWT Secret
    const dummyKeywords = ["your_super_secret", "secret123", "placeholder", "admin123", "change_me"];
    if (dummyKeywords.some((dummy) => data.JWT_ACCESS_SECRET.toLowerCase().includes(dummy))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_ACCESS_SECRET"],
        message: "JWT_ACCESS_SECRET cannot use default placeholder in production",
      });
    }

    // 4. Larangan menggunakan kunci Sandbox ('SB-') jika mode production aktif
    if (data.MIDTRANS_IS_PRODUCTION && data.MIDTRANS_SERVER_KEY?.startsWith("SB-")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MIDTRANS_SERVER_KEY"],
        message: "MIDTRANS_SERVER_KEY cannot use Sandbox key ('SB-') when MIDTRANS_IS_PRODUCTION is true",
      });
    }
  }
});
```

---

### Pilar 3: Zero Raw `process.env` Access (100% Menggunakan Singleton `env`)

Aplikasi telah dibersihkan dari pemanggilan `process.env` mentah dengan fallback berbahaya. Seluruh berkas infrastruktur kini mengimpor `env`:

1. **Database PostgreSQL:**
   [`backend/src/config/db.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/db.ts#L6-L15)
   Menggunakan `env.DB_HOST`, `env.DB_PORT`, `env.DB_PASSWORD`.
2. **Redis In-Memory Store:**
   [`backend/src/config/redis.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/redis.ts#L4-L8)
   Menggunakan `env.REDIS_HOST`, `env.REDIS_PORT`, `env.REDIS_PASSWORD`.
3. **Midtrans Payment Gateway:**
   [`backend/src/config/midtrans.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/midtrans.ts#L6-L16)
   Menggunakan `env.MIDTRANS_IS_PRODUCTION`, `env.MIDTRANS_SERVER_KEY`.
4. **Prisma ORM & Read Replica:**
   [`backend/src/config/prisma.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts#L13-L20)
   Menggunakan `env.NODE_ENV`, `env.DATABASE_REPLICA_URL`.
5. **Server HTTP Listener:**
   [`backend/src/server.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L4-L6)
   Menggunakan `env.PORT`.

---

### Pilar 4: Masking Pesan Error 500 (Pencegahan Information Disclosure)

Pada [`backend/src/middleware/errorMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/errorMiddleware.ts#L17-L35), pesan error internal disamarkan di mode produksi:

```typescript
// backend/src/middleware/errorMiddleware.ts
const isProduction = env.NODE_ENV === "production";
const isInternalServerError = statusCode >= 500;

// Log error asli lengkap hanya di server internal:
if (isInternalServerError) {
  console.error("❌ [UNHANDLED INTERNAL ERROR]:", err);
}

// Respon ke HTTP client disamarkan jika di production:
const message = isProduction && isInternalServerError
  ? "Internal Server Error"
  : err.message || "Internal Server Error";

const errors = isProduction && isInternalServerError ? null : err.errors || null;
```

---

### Pilar 6: Enkripsi Kunci Sensitif di Database (AES-256-GCM Encryption at Rest)

Kunci rahasia milik pengguna seperti `two_factor_secret` **dilarang disimpan dalam teks polos (plaintext)** di tabel database PostgreSQL. Jika database bocor, penyerang tidak boleh bisa membaca kunci OTP tersebut.

Di [`backend/src/utils/cryptoVault.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/utils/cryptoVault.ts), sistem mengamankan rahasia menggunakan standar **AES-256-GCM (Galois/Counter Mode)** dengan tag integritas:

```typescript
// backend/src/utils/cryptoVault.ts
// Output format: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
export const encryptSecret = (plaintext: string): string => { ... };
export const decryptSecret = (encryptedValue: string): string => { ... };
```

Setiap proses enkripsi menghasilkan **Initialization Vector (IV) acak 12-byte** yang unik, sehingga mengenkripsi data yang sama berkali-kali menghasilkan ciphertext yang berbeda (mencegah analisis pola data oleh penyerang).

---

### Pilar 7: Pemindaian Otomatis Kebocoran Kunci (Secret Leak Scanner)

Untuk memastikan tidak ada developer yang tidak sengaja menuliskan API Key, Private Key, atau token pembayaran di dalam kode sumber, disediakan utilitas scanner otomatis di [`backend/scripts/scanSecrets.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/scanSecrets.ts):

```bash
# Menjalankan pemindaian seluruh file kode sumber
npm run scan:secrets
```

Perintah ini dapat dipasang sebagai **Git Pre-commit Hook** atau pada **CI/CD Pipeline** agar setiap `git commit` atau *Pull Request* yang tidak sengaja memuat kredensial otomatis ditolak.

---

## 4. Cara Menghasilkan Kunci Kriptografi yang Aman (Cryptographic Entropy)

Jangan pernah membuat kunci JWT menggunakan kata-kata tebakan manusia. Gunakan generator kriptografi berstandar CSPRNG (*Cryptographically Secure Pseudo-Random Number Generator*):

```bash
# Menggunakan Node.js crypto bawaan (menghasilkan 64 karakter heksadesimal / 256-bit):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Atau menggunakan utilitas OpenSSL di terminal Linux:
openssl rand -hex 32
```

Salin hasil acak tersebut ke field `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` pada file `.env`.

---

## 5. Developer Security Checklist untuk Variables & Secrets

- [x] **Zero Hardcoded Secrets:** Tidak ada string kunci, token, atau password yang ditulis di dalam file TypeScript/JavaScript.
- [x] **Karantina Git:** File `.env` dan `.env.*` terdaftar di `.gitignore`.
- [x] **Template Tersedia:** File `.env.example` terdokumentasi rapi tanpa memuat kredensial asli.
- [x] **Fail-Fast Schema Validation:** Semua variabel divalidasi oleh Zod di `backend/src/config/env.ts`.
- [x] **Panjang Kunci Kriptografi:** `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` minimal 32 karakter acak (256-bit).
- [x] **Production Guarding:** Validasi `superRefine` menolak database password kosong dan koneksi HTTP non-HTTPS di production.
- [x] **No Direct `process.env` Access:** Seluruh berkas modul mengimpor singleton `env`, mencegah fallback liar.
- [x] **Error Response Masking:** Error 500 menyamarkan pesan detail internal saat berjalan di lingkungan produksi.
- [x] **Encryption at Rest (AES-256-GCM):** Kunci rahasia `two_factor_secret` disimpan terenkripsi di database melalui `cryptoVault.ts`.
- [x] **Automated Secret Scanning:** Tool `npm run scan:secrets` siap digunakan untuk memblokir kebocoran kredensial sebelum git commit.

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Validasi Zod fail-fast, isolasi singleton `env`, enkripsi authenticated AES-256-GCM di database via `cryptoVault.ts`, dan scanner kebocoran rahasia `scanSecrets.ts` telah aktif.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Cloud KMS & Secret Vault Integration (Diskless Secret Architecture):**  
   Saat ini rahasia masih dibaca dari file `.env` lokal di disk server. Batasan mentok di cloud production adalah meniadakan file `.env` fisik sama sekali dan mengambil rahasia secara dinamis dari **AWS Secrets Manager** atau **HashiCorp Vault** langsung ke memori RAM saat container Node.js menyala.
2. **Automated Secret Rotation Pipeline (Rotasi 90 Hari):**  
   Belum ada pipeline otomatis untuk merotasi password database dan token API Midtrans secara berkala setiap 90 hari dengan dukungan *Grace Period* kunci ganda (kunci lama dan kunci baru diterima bersamaan selama masa transisi 24 jam).

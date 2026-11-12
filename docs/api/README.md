# Nexa Streetwear REST API Specification

Selamat datang di dokumentasi resmi REST API **Nexa Streetwear E-Commerce**. Seluruh endpoint dirancang mengikuti standar RESTful modern, arsitektur *Defense-in-Depth*, respons format terstandarisasi, dan optimasi performa tinggi via Redis & PostgreSQL.

---

## 1. Konvensi Dasar & Lingkungan (Environments)

| Lingkungan | Base URL | Protokol |
|:---|:---|:---|
| **Local Development** | `http://localhost:5000/api` | HTTP/1.1 |
| **Production** | `https://api.nexa.com/api` | HTTPS (TLS 1.3) |

---

## 2. Standar Format Respons (Standard Envelope)

Seluruh respons dari server Nexa dibungkus menggunakan format JSON yang konsisten:

### Respons Sukses (`status: "success"`)
```json
{
  "status": "success",
  "message": "Operasi berhasil dijalankan",
  "payload": {
    "id": 1,
    "name": "Nexa Cyber Hoodie"
  }
}
```

### Respons Validasi / Kesalahan Klien (`status: "fail"`)
```json
{
  "status": "fail",
  "message": "Validasi input gagal",
  "errors": [
    {
      "field": "email",
      "message": "Format email tidak valid"
    }
  ]
}
```

### Respons Kesalahan Server (`status: "error"`)
```json
{
  "status": "error",
  "message": "Internal Server Error"
}
```

---

## 3. Protokol Keamanan & HTTP Headers

| Header | Wajib? | Keterangan |
|:---|:---:|:---|
| `Content-Type: application/json` | Ya (untuk body JSON) | Format data yang dikirim ke server. |
| `Authorization: Bearer <accessToken>` | Ya (endpoint terproteksi) | JWT Access Token berumur 15 menit. |
| `x-csrf-token: <csrfToken>` | Ya (mutasi data via browser) | Proteksi CSRF Double-Submit Cookie. |
| `Idempotency-Key: <UUID>` | Ya (Checkout & Pembayaran) | Mencegah transaksi ganda jika terjadi *retry* jaringan. |

---

## 4. Daftar Modul API

Dokumentasi detail per modul terbagi rapi ke dalam dokumen-dokumen berikut:

| No | Modul | Dokumen | Cakupan Endpoint |
|:---|:---|:---|:---|
| 01 | **Authentication & Security** | [01-auth.md](./01-auth.md) | Register, Login, Refresh, Logout, 2FA TOTP (Google Authenticator), Email OTP, & Google OAuth2 SSO. |
| 02 | **Users & Addresses** | [02-users-and-addresses.md](./02-users-and-addresses.md) | Profil User, Ganti Password, & Manajemen Alamat Pengiriman Pengguna. |
| 03 | **Products & Categories** | [03-products-and-categories.md](./03-products-and-categories.md) | Katalog Produk, FTS Trigram Search, Varian Warna/Ukuran, WebP Upload, & Kategori Hierarkis. |
| 04 | **Cart & Wishlist** | [04-cart-and-wishlist.md](./04-cart-and-wishlist.md) | Keranjang Belanja Pelanggan, Mutasi Item Kuantitas, & Toggle Wishlist Produk Favorit. |
| 05 | **Orders & Checkout** | [05-orders-and-checkout.md](./05-orders-and-checkout.md) | Transaksi Checkout dengan Idempotency Key, Riwayat Pesanan, Pembatalan, & Manajemen Pesanan Admin. |
| 06 | **Payments & Shippings** | [06-payments-and-shippings.md](./06-payments-and-shippings.md) | Midtrans Snap Token, Webhook Signature Verification, Kalkulasi Ongkir, & Nomor Resi (AWB). |
| 07 | **Reviews & System Health** | [07-reviews-and-health.md](./07-reviews-and-health.md) | Ulasan & Rating Bintang Produk serta Endpoint Docker/K8s Health Check Probe. |

---

## Review Senior Backend: Roadmap Standarisasi API (Batasan Mentok)

Secara umum arsitektur REST API Nexa sudah sangat solid dengan envelope seragam, rate limiting berjenjang, dan proteksi idempotency. Namun untuk mencapai **level kematangan industri tertinggi (Richardson Maturity Model Level 3 & Enterprise Standards)**, hal-hal berikut belum diimplementasikan:

1. **OpenAPI / Swagger 3.0 Interactive Documentation (`/api/docs`):**  
   Saat ini dokumentasi masih berupa berkas Markdown statis. Batasan mentoknya adalah auto-generation OpenAPI spec via library (seperti `tsoa` atau `@asteasolutions/zod-to-openapi`) agar tim frontend dapat men-generate TypeScript types/SDK secara otomatis dan mencoba request interaktif di browser.
2. **Global API Versioning Prefix (`/api/v1/`):**  
   Seluruh endpoint saat ini berada di bawah rute datar `/api/`. Batasan mentoknya adalah mengisolasi ke `/api/v1/` agar saat terjadi *breaking changes* di masa depan, sistem dapat merilis `/api/v2/` tanpa merusak integrasi aplikasi mobile versi lama yang belum diperbarui oleh pengguna.
3. **Automated API Contract Testing (Pact / Supertest):**  
   Belum ada pipeline automated contract test di CI/CD yang memverifikasi bahwa respons payload JSON backend selalu sesuai 100% dengan ekspektasi TypeScript types frontend.

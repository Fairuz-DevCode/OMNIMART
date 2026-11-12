# 01. Authentication & Security API

Modul autentikasi Nexa mendukung arsitektur Dual-Token JWT (Access Token 15 menit + HttpOnly Refresh Token 7 hari dengan Refresh Token Rotation), Google OAuth2 SSO, serta Two-Factor Authentication (TOTP Authenticator & Email OTP Fallback).

---

## 1. Register User Baru
Mendaftarkan pelanggan baru ke sistem.

* **Method:** `POST`
* **URL:** `/api/auth/register`
* **Auth:** Publik
* **Rate Limit:** 15 req / 15 menit

### Request Body:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!"
}
```

### Response Success (`201 Created`):
```json
{
  "status": "success",
  "message": "Registration Succes",
  "payload": {
    "user": {
      "id": 42,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```
*(Catatan: Cookie `refreshToken` terpasang otomatis sebagai `HttpOnly`)*

---

## 2. Login User
Melakukan autentikasi kredensial email dan kata sandi.

* **Method:** `POST`
* **URL:** `/api/auth/login`
* **Auth:** Publik
* **Rate Limit:** 15 req / 15 menit

### Request Body:
```json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
```

### Skenario A: Akun Tanpa 2FA (`200 OK`)
```json
{
  "status": "success",
  "message": "Login successful",
  "payload": {
    "user": {
      "id": 42,
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```

### Skenario B: Akun Mengaktifkan 2FA (`200 OK`)
Jika user mengaktifkan 2FA, sistem menahan token penuh dan meminta verifikasi kode 6-digit:
```json
{
  "status": "2fa_required",
  "message": "Two-factor authentication code required",
  "payload": {
    "mfaRequired": true,
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": 42,
      "email": "jane@example.com"
    }
  }
}
```
*(Gunakan `tempToken` untuk memanggil `/api/auth/2fa/login` atau `/api/auth/2fa/email/verify`)*.

---

## 3. Refresh Access Token
Memperbarui token akses yang kedaluwarsa via Refresh Token Rotation (RTR).

* **Method:** `POST`
* **URL:** `/api/auth/refresh`
* **Auth:** Menggunakan cookie `refreshToken`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Access token refreshed successfully",
  "payload": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```

---

## 4. Logout User
Menghapus sesi refresh token dari Redis dan database.

* **Method:** `POST`
* **URL:** `/api/auth/logout`
* **Auth:** Menggunakan cookie `refreshToken`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Logout successful"
}
```

---

## 5. Google OAuth2 Single Sign-On (SSO)
Masuk atau mendaftar otomatis menggunakan akun Google resmi.

* **Method:** `POST`
* **URL:** `/api/auth/google`
* **Auth:** Publik

### Request Body:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "accessToken": "ya29.a0AfH6SM..."
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Successfully authenticated with Google",
  "payload": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": 42,
      "name": "Jane Google",
      "email": "jane@gmail.com",
      "role": "user"
    }
  }
}
```

---

## 6. Two-Factor Authentication (TOTP / Authenticator App)

### A. Setup 2FA (Generate QR Code)
* **Method:** `POST`
* **URL:** `/api/auth/2fa/setup`
* **Headers:** `Authorization: Bearer <accessToken>`

#### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Scan this QR code with Google Authenticator or enter the manual key.",
  "payload": {
    "manualKey": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

### B. Verify & Aktifkan 2FA Pertama Kali
* **Method:** `POST`
* **URL:** `/api/auth/2fa/verify`
* **Headers:** `Authorization: Bearer <accessToken>`

#### Request Body:
```json
{
  "token": "849201"
}
```

### C. Selesaikan Login 2FA via Kode Authenticator
* **Method:** `POST`
* **URL:** `/api/auth/2fa/login`
* **Auth:** Publik (via `tempToken`)

#### Request Body:
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "token": "849201"
}
```

#### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "2FA authentication successful",
  "payload": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": 42,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    }
  }
}
```

### D. Nonaktifkan 2FA
* **Method:** `POST`
* **URL:** `/api/auth/2fa/disable`
* **Headers:** `Authorization: Bearer <accessToken>`

#### Request Body:
```json
{
  "token": "849201"
}
```

---

## 7. Two-Factor Authentication (Email OTP Fallback)

### A. Minta Kode 2FA Dikirim ke Email
* **Method:** `POST`
* **URL:** `/api/auth/2fa/email/request`
* **Rate Limit:** Cooldown 60 detik per user

#### Request Body:
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

#### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Kode verifikasi 6-digit telah dikirimkan ke email jane@example.com. Kode berlaku 5 menit."
}
```

### B. Selesaikan Login 2FA via Kode Email
* **Method:** `POST`
* **URL:** `/api/auth/2fa/email/verify`

#### Request Body:
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "code": "592184"
}
```

#### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "2FA Email authentication successful",
  "payload": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": 42,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    }
  }
}
```

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Pendaftaran user baru, login kata sandi, validasi Zod, dan dual-token JWT (Access 15m + Refresh 7d) telah berjalan stabil.
* Refresh Token Rotation (RTR) dengan deteksi pencurian token dan grace period 15 detik sudah aktif.
* Google OAuth2 SSO terintegrasi dengan validasi kriptografis `OAuth2Client` dan pencegahan pre-account takeover.
* Two-Factor Authentication (TOTP Authenticator & Email OTP fallback) dengan anti-replay Redis telah terpasang.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Forgot & Reset Password Flow (`POST /api/auth/forgot-password` & `POST /api/auth/reset-password`):**  
   Belum ada alur pemulihan akun jika pengguna lupa kata sandi. Batasan mentoknya membutuhkan pembuatan signed token berumur 15 menit (`crypto.randomBytes(32)` di-hash SHA-256 di database) yang dikirimkan via email dengan single-use invalidation.
2. **Account Lockout Policy (Brute-Force Account Defense):**  
   Saat ini rate limiting hanya beroperasi di level IP address via Redis (`authLimiter`). Batasan mentoknya adalah mengunci akun di level database jika terjadi **5 kali salah password berturut-turut** pada akun yang sama selama 15–30 menit, untuk menangkal serangan *Distributed Brute Force* (ribuan IP menyerang 1 akun email).
3. **Active Sessions Management & Revoke All Devices (`GET /api/auth/sessions` & `POST /api/auth/sessions/revoke-all`):**  
   Pengguna belum bisa melihat daftar perangkat aktif (Browser, OS, IP, Lokasi, Waktu Login Terakhir) atau menekan tombol "Keluar dari Semua Perangkat". Batasan mentoknya memerlukan penyimpanan metadata sesi di Redis set atau tabel `sessions`.
4. **OAuth 2.0 PKCE (Proof Key for Code Exchange):**  
   Untuk klien mobile native (Android / iOS) atau SPA tanpa backend rahasia, implementasi mentok mewajibkan alur PKCE (`code_challenge` dan `code_verifier`) guna mencegah serangan *Authorization Code Interception*.

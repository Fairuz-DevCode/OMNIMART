# 02. Users & Addresses API

Modul ini mengelola data profil pengguna akun, perubahan kata sandi terotentikasi, serta buku alamat pengiriman (*shipping addresses*) pelanggan.

---

## 1. Ambil Profil Pengguna Saat Ini
Mengambil data detail akun yang sedang login.

* **Method:** `GET`
* **URL:** `/api/users/me`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "User profile fetched successfully",
  "payload": {
    "id": 42,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+6281234567890",
    "role": "user",
    "is_two_factor_enabled": true,
    "created_at": "2026-10-15T08:30:00.000Z"
  }
}
```

---

## 2. Perbarui Profil Pengguna
Memperbarui nama atau nomor telepon pengguna.

* **Method:** `PATCH`
* **URL:** `/api/users/me`
* **Headers:** `Authorization: Bearer <accessToken>`

### Request Body:
```json
{
  "name": "Jane Alexander",
  "phone": "+6281299998888"
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "payload": {
    "id": 42,
    "name": "Jane Alexander",
    "email": "jane@example.com",
    "phone": "+6281299998888"
  }
}
```

---

## 3. Ganti Kata Sandi (Change Password)
Memperbarui password akun dengan memverifikasi password lama terlebih dahulu.

* **Method:** `PUT`
* **URL:** `/api/users/me/change-password`
* **Headers:** `Authorization: Bearer <accessToken>`

### Request Body:
```json
{
  "old_password": "OldPassword123!",
  "new_password": "NewSecretPassword456!"
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Password updated successfully"
}
```

---

## 4. Daftar Alamat Pengiriman Pelanggan
Mengambil seluruh daftar alamat tujuan pengiriman milik user.

* **Method:** `GET`
* **URL:** `/api/addresses`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Addresses retrieved successfully",
  "payload": [
    {
      "id": 101,
      "recipient_name": "Jane Doe",
      "phone": "+6281234567890",
      "address_line": "Jl. Senopati No. 88, Kebayoran Baru",
      "city": "Jakarta Selatan",
      "province": "DKI Jakarta",
      "postal_code": "12190",
      "is_default": true
    }
  ]
}
```

---

## 5. Tambah Alamat Pengiriman Baru
Menambahkan alamat baru ke buku alamat pelanggan. Terdapat proteksi pencegahan alamat duplikat (*anti-duplicate guard*).

* **Method:** `POST`
* **URL:** `/api/addresses`
* **Headers:** `Authorization: Bearer <accessToken>`

### Request Body:
```json
{
  "recipient_name": "Jane Doe",
  "phone": "+6281234567890",
  "address_line": "Jl. Senopati No. 88, Kebayoran Baru",
  "city": "Jakarta Selatan",
  "province": "DKI Jakarta",
  "postal_code": "12190",
  "is_default": true
}
```

### Response Success (`201 Created`):
```json
{
  "status": "success",
  "message": "Address created successfully",
  "payload": {
    "id": 102,
    "recipient_name": "Jane Doe",
    "address_line": "Jl. Senopati No. 88, Kebayoran Baru",
    "city": "Jakarta Selatan",
    "is_default": true
  }
}
```

---

## 6. Perbarui Alamat Pengiriman
Memperbarui rincian alamat tertentu.

* **Method:** `PATCH`
* **URL:** `/api/addresses/:id`
* **Headers:** `Authorization: Bearer <accessToken>`

### Request Body:
```json
{
  "postal_code": "12191",
  "is_default": true
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Address updated successfully",
  "payload": {
    "id": 102,
    "postal_code": "12191",
    "is_default": true
  }
}
```

---

## 7. Hapus Alamat Pengiriman
Menghapus alamat dari daftar akun. Alamat yang terikat pada riwayat pesanan masa lalu terlindungi dari *hard deletion* untuk menjaga integritas data logistik.

* **Method:** `DELETE`
* **URL:** `/api/addresses/:id`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Address deleted successfully"
}
```

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Profil user (`/me`), update profil nama/telepon, dan ganti password terotentikasi sudah berjalan dengan verifikasi Bcrypt.
* Manajemen alamat pengiriman lengkap dengan proteksi duplikasi alamat (`checkDuplicateAddress`) dan penentuan alamat default (`is_default`).

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Email Change Verification Handshake (`POST /api/users/me/email/request` & `POST /api/users/me/email/verify`):**  
   Saat ini endpoint update profil belum menyediakan mekanisme pergantian email. Batasan mentoknya membutuhkan verifikasi 2 arah: mengirim link konfirmasi ke email lama dan kode verifikasi ke email baru untuk mencegah pembajakan akun jika sesi terbuka sesaat.
2. **Phone Number Verification via WhatsApp / SMS OTP (`POST /api/users/me/phone/verify`):**  
   Nomor telepon saat ini hanya divalidasi formatnya via `libphonenumber-js` tanpa pembuktian kepemilikan. Batasan mentok e-commerce mewajibkan nomor telepon terverifikasi OTP sebelum bisa dipakai untuk checkout pengiriman kurir.
3. **Avatar / Profile Picture Upload (`PATCH /api/users/me/avatar`):**  
   Belum ada endpoint upload foto profil pengguna menggunakan multipart form-data, kompresi Sharp WebP (dimensi 256x256), dan penyimpanan terisolasi.
4. **Self-Service Account Deletion (GDPR / UU PDP Right to be Forgotten):**  
   Belum ada endpoint `DELETE /api/users/me` bagi pengguna yang ingin menghapus akun mereka sendiri. Batasan mentoknya memerlukan proses *Data Anonymization* (mengubah nama dan email menjadi `deleted_user_xyz@anonymized.local` agar relasi riwayat faktur pajak dan pesanan masa lalu tetap valid di database).

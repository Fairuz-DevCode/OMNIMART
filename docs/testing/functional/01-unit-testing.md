# Functional Testing: Unit Testing Architecture

Dokumen ini membedah arsitektur, filosofi desain, dan implementasi **Unit Testing** pada sistem backend **Nexa Streetwear**.

---

## 1. Filosofi: Unit of Behavior vs Unit of File

Di industri rekayasa perangkat lunak modern, terdapat dua pendekatan dalam memandang Unit Test:

1. **Unit of File (Pendekatan Tradisional / Solitary):**
   - Mengharuskan setiap file `.ts` memiliki 1 file `.test.ts` pendamping (misal: `user.controller.test.ts`).
   - Menuntut pemalsuan (*heavy mocking*) pada seluruh dependensi (Express `req`/`res`, Prisma ORM, Redis).
   - **Kelemahan:** Menguji kode palsu (*mock*), sangat rapuh (*brittle*), dan membuang waktu maintenance saat refactoring.
2. **Unit of Behavior (Pendekatan Nexa / Sociable):**
   - Unit didefinisikan sebagai **satuan logika bisnis atau aturan komputasi**.
   - Komponen yang memiliki logika komputasi murni (Zod DTO, kalkulasi voucher, hash, token) diuji dengan **Unit Test murni**.
   - Komponen perekat seperti *Controller* dan *Service* yang berinteraksi langsung dengan database diuji secara terpadu melalui **Integration Test**.

---

## 2. Cakupan Berkas Unit Test di Codebase

Pengujian unit di Nexa mencakup 8 berkas dengan 30 skenario pengujian:

### A. Validasi Skema Data (Zod DTO)
1. **[authValidation.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/unit/authValidation.test.ts):**
   - Menguji batasan nama (min 1, max 50) dan memblokir kata terlarang (`admin`, `root`) menggunakan `superRefine`.
   - Menguji standar email valid dan kompleksitas password (huruf besar, kecil, angka, simbol).
2. **[userValidation.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/unit/userValidation.test.ts):**
   - Menguji validasi nomor telepon Indonesia (+62 / 08) menggunakan parser resmi `libphonenumber-js`.
   - Menguji validasi penggantian password (`currentPassword` wajib diisi).
3. **[cartAndOrderValidation.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/unit/cartAndOrderValidation.test.ts):**
   - Menguji penolakan kuantitas keranjang bernilai negatif atau desimal.
   - Menguji validasi ID alamat dan biaya ongkos kirim non-negatif.
4. **[addressAndShippingValidation.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/unit/addressAndShippingValidation.test.ts):**
   - Menguji kelengkapan alamat, kode pos wajib 5 digit numerik, dan status kurir yang diizinkan (`pending`, `in_transit`, `shipped`, `delivered`).
5. **[reviewAndPaymentValidation.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/unit/reviewAndPaymentValidation.test.ts):**
   - Menguji rating ulasan (1 hingga 5 bintang) dan batasan komentar maksimal 500 karakter.
   - Menguji skema pembayaran pesanan.

### B. Logika Finansial & Utilities Kriptografi
6. **[orderCalculation.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/unit/orderCalculation.test.ts):**
   - Menguji kalkulasi subtotal barang `price * quantity`.
   - Menguji kalkulasi diskon voucher (persentase dengan batas maksimal / *cap*, serta syarat minimum belanja).
   - Menguji pembulatan bobot gram ke kilogram untuk ekspedisi kurir.
   - Menguji validasi pengurangan stok agar tidak pernah menghasilkan nilai minus.
7. **[jwtAuthToken.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/unit/jwtAuthToken.test.ts):**
   - Menguji penerbitan Access Token (15 menit) dan Refresh Token (7 hari) berspesifikasi algoritma HS256.
   - Menguji penolakan token yang tanda tangannya telah dimanipulasi (*tampered signature*).
   - Menguji *hashing* dan verifikasi kecocokan password via bcrypt.
8. **[cryptoVaultAndAppError.test.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/unit/cryptoVaultAndAppError.test.ts):**
   - Menguji enkripsi dan dekripsi simetris AES-256-GCM berformat `enc:v1:<iv>:<auth_tag>:<ciphertext>`.
   - Menguji integritas autentikasi data (*tamper resistance*) saat ciphertext dirusak.
   - Menguji pemisahan status `fail` (4xx) dan `error` (5xx) pada kelas `AppError`.

---

## 3. Cara Menjalankan

```bash
# Menjalankan seluruh Unit Test (Selesai dalam ~500ms)
npm run test:unit
```

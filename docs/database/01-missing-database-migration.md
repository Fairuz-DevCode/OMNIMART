# 01. Missing Database Migration

## 1. Masalah yang Terjadi
Pada pengembangan software modern tanpa migrasi database:
* **Schema Drift:** Perubahan struktur tabel (misal: penambahan kolom baru `img_url` atau perubahan tipe data) dilakukan secara manual langsung di GUI database (pgAdmin / DBeaver) di laptop developer.
* **Tidak Reproducible:** Ketika kode di-deploy ke staging atau server production, aplikasi langsung *crash* karena kolom baru belum dibuat.
* **Tidak Ada Riwayat (No Version Control):** Tidak ada rekam jejak kapan suatu tabel diubah, siapa yang mengubah, dan mustahil melakukan *rollback* secara aman jika ada kesalahan desain skema.

---

## 2. Solusi Best Practice
Menggunakan **Database Migration Tool** berbasis deklaratif atau imperatif:
1. Skema didefinisikan dalam kode sumber (*Infrastructure as Code / Schema as Code*).
2. Setiap perubahan menghasilkan berkas migrasi SQL berstempel waktu (*timestamped migration file*).
3. Tabel riwayat migrasi (`_prisma_migrations`) mencatat berkas mana saja yang sudah dieksekusi di database target.
4. Server production cukup menjalankan perintah migrasi otomatis saat proses deployment / startup container.

---

## 3. Implementasi di Project Ini

Project ini menggunakan **Prisma Migrate** yang terintegrasi dengan PostgreSQL 16.

### A. Definisi Skema Deklaratif
Skema seluruh tabel, relasi, tipe enum, dan constraint didefinisikan di:
[`backend/prisma/schema.prisma`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma)

Contoh pendefinisian model:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum OrderStatus {
  pending
  paid
  shipped
  delivered
  cancelled
}

model orders {
  id           Int         @id @default(autoincrement())
  order_number String      @unique @db.VarChar
  user_id      Int
  status       OrderStatus @default(pending)
  ...
}
```

### B. Berkas Riwayat Migrasi SQL
Riwayat migrasi tersimpan rapi di direktori:
[`backend/prisma/migrations/`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/migrations/)

Setiap migrasi memiliki folder timestamp dan file `migration.sql` murni yang bisa diaudit oleh DBA sebelum diaplikasikan.

### C. Shortcut Eksekusi di [`package.json`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/package.json#L13)
Untuk deployment otomatis tanpa prompt interaktif di container Docker / CI-CD:
```bash
npm run db:migrate
```
Perintah ini menjalankan `prisma migrate deploy` yang secara aman hanya mengeksekusi migrasi yang belum terpasang di database production.

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Skema terpusat di `schema.prisma`, histori migrasi tersimpan di tabel `_prisma_migrations`, dan eksekusi non-interaktif `prisma migrate deploy` siap untuk CI/CD.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Zero-Downtime Migration Pattern (Expand & Contract):**  
   Saat ini jika ada perubahan skema drastis (seperti rename kolom atau pemecahan tabel), migrasi standar akan mengunci tabel (*table lock*). Batasan mentok enterprise menerapkan pola 3 tahap: (1) Buat kolom baru berdampingan, (2) Tulis data ke kedua kolom (dual-write), (3) Migrasi pembacaan dan hapus kolom lama setelah deployment sukses tanpa downtime sedetik pun.
2. **Automated Down Migration (Rollback Scripts):**  
   Prisma secara desain tidak menyediakan mekanisme `prisma migrate down` otomatis. Batasan mentoknya adalah mendokumentasikan dan menyediakan script `rollback.sql` pendamping pada setiap folder migrasi untuk mitigasi insiden jika migrasi gagal di database production.

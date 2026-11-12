# 08. File Descriptor Exhaustion & EMFILE Limits

Dokumen ini membedah masalah **File Descriptor Exhaustion** (kehabisan deskriptor berkas pada sistem operasi Linux), bagaimana batas default `ulimit` dapat memblokir soket jaringan dan penulisan berkas di e-commerce, serta mitigasi arsitektur di project **Nexa Streetwear**.

---

## 1. Anatomi Masalah: Filosofi Linux "Everything is a File"

Dalam arsitektur sistem operasi Linux dan UNIX, hampir semua entitas I/O direpresentasikan sebagai berkas (*file*). Ketika proses Node.js berinteraksi dengan:
1. File fisik di disk (file log, gambar produk WebP, file konfigurasi `.env`).
2. Soket jaringan TCP yang masuk (*incoming client connections* dari browser).
3. Soket jaringan TCP yang keluar (*outgoing connections* ke PostgreSQL, Redis, Midtrans).
4. Pipes dan Unix Domain Sockets.

Sistem operasi mengalokasikan sebuah bilangan bulat non-negatif yang disebut **File Descriptor (FD)** sebagai penunjuk (*handle*) ke entitas tersebut di dalam tabel berkas kernel.

```
+-------------------------------------------------------------------------------+
|                             TABEL FILE DESCRIPTOR (FD)                        |
|   FD 0 : Standard Input (stdin)                                               |
|   FD 1 : Standard Output (stdout)                                             |
|   FD 2 : Standard Error (stderr)                                              |
|   FD 3 : Database Socket TCP (PostgreSQL port 5432)                           |
|   FD 4 : Cache Socket TCP (Redis port 6379)                                   |
|   FD 5 : Log File Stream (access-2026-11-12.log)                              |
|   FD 6 ... FD 1023 : HTTP Incoming User Sockets                              |
|   [BATAS TERCAPAI: 1024] => ERROR: EMFILE (Too many open files)              |
+-------------------------------------------------------------------------------+
```

### Mengapa File Descriptor Bisa Habis?
1. **Batas Bawaan yang Sangat Kecil (`ulimit -n`):**  
   Banyak distribusi Linux default menetapkan batas lunak (*Soft Limit*) hanya **1.024 file descriptor per proses**.
2. **Koneksi Pengunjung yang Bersamaan (*Concurrent Users*):**  
   Jika ada 1.000 pengunjung yang mengakses website secara bersamaan, setiap soket HTTP memakan 1 FD. Ditambah koneksi database dan file log, batas 1.024 langsung terlampaui seketika.
3. **Kebocoran File Descriptor (*FD Leak*):**  
   Membuka file atau koneksi soket tanpa pernah menutupnya secara eksplisit (`stream.end()` atau `socket.destroy()`).

### Gejala Eror di Node.js
```text
Error: EMFILE: too many open files, open '/logs/access/access-2026-11-12.log'
Error: accept EMFILE (Kernel menolak koneksi HTTP baru dari pembeli)
```

---

## 2. Dampak Fatal pada Operasional E-Commerce

* **Server Menolak Pembeli Baru:** Node.js tidak bisa menerima handshake koneksi HTTP baru; pembeli melihat pesan *Connection Dropped* atau *Failed to load resource*.
* **Kegagalan Query Database:** Prisma tidak dapat membuka soket koneksi baru ke PostgreSQL, menyebabkan API produk melempar status HTTP 500.
* **Kegagalan Pencatatan Log:** Log transaksi gagal ditulis ke disk, menghilangkan jejak audit pembayaran.

---

## 3. Strategi & Best Practices Mitigasi EMFILE

### A. Menaikkan Batas File Descriptor Sistem & Proses
Ubah batas limit file descriptor pada server produksi menjadi **65.535** atau lebih:
```bash
# 1. Edit /etc/security/limits.conf
*    soft    nofile    65535
*    hard    nofile    65535

# 2. Jika menjalankan Node.js via Systemd Service, tambahkan di unit file:
[Service]
LimitNOFILE=65535
```

### B. Rotasi & Penutupan Stream yang Disiplin
Setiap kali membuka file stream (misal untuk rotasi log harian), pastikan stream berkas sebelumnya ditutup menggunakan `.end()`.

### C. Batasi Ukuran Connection Pool
Jangan biarkan connection pool database membuka koneksi tanpa batas. Batasi ukuran pool ke angka yang aman (misalnya 10–30 koneksi).

---

## 4. Implementasi Nyata di Codebase Nexa Streetwear

### A. Penutupan Otomatis File Stream Lama: [`backend/src/middleware/accessLogMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/accessLogMiddleware.ts#L37-L61)
Sistem log memastikan file descriptor lama tidak pernah menggantung:

```typescript
// Saat tanggal berganti, tutup stream hari kemarin sebelum membuka stream hari ini
if (currentWriteStream && !currentWriteStream.destroyed) {
  currentWriteStream.end();
}

// Tutup stream dengan rapi saat server shutdown agar FD dilepas kembali ke OS
const closeStream = () => {
  if (currentWriteStream && !currentWriteStream.destroyed) {
    currentWriteStream.end();
  }
};
process.on("SIGTERM", closeStream);
process.on("SIGINT", closeStream);
```

### B. Pengendalian Soket Koneksi Tunggal: [`backend/src/config/redis.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/redis.ts) & [`prisma.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts)
Dengan menggunakan singleton, aplikasi Nexa hanya mengonsumsi **1 FD tetap untuk Redis** dan **10–20 FD tetap untuk database PostgreSQL**, menyisakan >99% alokasi FD yang tersedia murni untuk melayani soket HTTP pembeli.

---

## 5. Cheatsheet Monitoring & Deteksi File Descriptor

### 1. Memeriksa Batas Limit File Descriptor Proses Node.js
```bash
# Cari PID proses node
PID=$(pgrep -f "node")

# Cek batas Max open files proses tersebut
cat /proc/$PID/limits | grep "Max open files"
```
*Pastikan Soft Limit bernilai minimal 65535 pada server produksi!*

### 2. Menghitung Jumlah File Descriptor yang Sedang Terbuka
```bash
# Hitung total file descriptor aktif pada proses Node.js
sudo lsof -p $PID | wc -l

# Lihat daftar detail FD yang sedang dipegang proses (file, TCP socket, pipe)
sudo lsof -p $PID
```

### 3. Memeriksa Alokasi File Descriptor Tingkat Sistem Operasi
```bash
# Kolom: [FD Sedang Digunakan] [FD Bebas yang Dialokasikan] [Maksimal FD Sistem]
cat /proc/sys/fs/file-nr
```

---

## 6. Kesimpulan

Dengan memastikan **Siklus Hidup Stream Tertutup (`stream.end()`)**, **Koneksi Database Terpusat**, dan **Penaikan Batas Limit Linux (`LimitNOFILE=65535`)**, backend Nexa Streetwear kebal terhadap eror `EMFILE: too many open files` dan siap menampung lonjakan ribuan pengunjung secara bersamaan.

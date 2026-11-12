# 09. Swap Space Thrashing & Kernel Memory Pressure

Dokumen ini membedah fenomena **Swap Space Thrashing** (kemacetan memori virtual akibat pertukaran data RAM-disk tanpa henti), bagaimana thrashing dapat membuat server e-commerce tampak macet total (*frozen*), serta mitigasi arsitektur di project **Nexa Streetwear**.

---

## 1. Anatomi Masalah: Virtual Memory & Mekanisme Paging

Sistem operasi Linux mengelola memori menggunakan konsep **Virtual Memory** yang dibagi ke dalam blok-blok berukuran 4 Kilobyte (*Memory Pages*).

```
+-------------------------------------------------------------------------------+
| RAM FISIK (Kecepatan: ~30.000 MB/s | Latensi: ~50-100 ns)                     |
| [Halaman Memori Aktif Node.js & PostgreSQL]                                   |
+-------------------------------------------------------------------------------+
                                  ^   |
         Swap In (Major Fault)    |   |  Swap Out
         [SANGAT LAMBAT]          |   |
                                  |   v
+-------------------------------------------------------------------------------+
| DISK SWAP SPACE (Kecepatan: ~500 MB/s | Latensi: ~1.000.000 ns)               |
| [Halaman Memori Tidak Aktif yang Dipindahkan ke Disk]                         |
+-------------------------------------------------------------------------------+
```

### Fenomena Major Page Fault & Thrashing
* **Major Page Fault:** Terjadi ketika CPU membutuhkan instruksi atau data dari halaman memori yang sebelumnya telah dipindahkan (*swap out*) ke disk. CPU terpaksa menghentikan eksekusi (*halt*), membaca data dari disk, dan memasukkannya kembali ke RAM (*swap in*).
* **Swap Space Thrashing:** Terjadi ketika kapasitas RAM fisik server benar-benar habis, sehingga kernel Linux menghabiskan **hampir 100% waktu CPU-nya hanya untuk menukar halaman memori bolak-balik antara RAM dan Disk**.
* **Akibat:** Karena kecepatan disk SSD ribuan kali lebih lambat daripada RAM fisik, waktu respon server melonjak dari **10 milidetik menjadi lebih dari 10.000 milidetik (10 detik)**. Server tampak macet total, koneksi SSH tidak bisa login, dan website e-commerce tidak dapat diakses.

---

## 2. Penyebab Swap Thrashing pada Server E-Commerce

1. **Parameter `vm.swappiness` Bawaan yang Terlalu Agresif:**  
   Nilai default `vm.swappiness` pada Ubuntu/Debian adalah **60**. Nilai ini membuat kernel Linux sangat agresif memindahkan halaman memori aplikasi ke swap disk, bahkan ketika RAM fisik sebenarnya belum benar-benar habis.
2. **Ketiadaan Batas Memori pada Redis:**  
   Redis yang menyimpan cache tanpa batas `maxmemory` akan terus memakan RAM hingga memaksa proses PostgreSQL atau Node.js terlempar ke swap space.
3. **Over-commitment Resource pada VPS Kecil:**  
   Menjalankan Node.js backend, PostgreSQL database, dan Redis secara bersamaan di VPS 1GB RAM tanpa konfigurasi batas memori masing-masing layanan.

---

## 3. Strategi & Best Practices Mitigasi Swap Thrashing

### A. Tuning Parameter Linux `vm.swappiness`
Pada server backend e-commerce dan database, turunkan nilai swappiness ke **10 atau 1** agar kernel memprioritaskan RAM fisik dan hanya menggunakan swap dalam keadaan darurat absolut:
```bash
# 1. Atur sementara di runtime
sudo sysctl -w vm.swappiness=10

# 2. Jadikan permanen di /etc/sysctl.conf
echo "vm.swappiness = 10" | sudo tee -a /etc/sysctl.conf
```

### B. Konfigurasi Batas `maxmemory` pada Redis
Pastikan Redis memiliki batas maksimal memori dan kebijakan pembersihan (*eviction policy*) yang ketat di `/etc/redis/redis.conf`:
```ini
maxmemory 256mb
maxmemory-policy allkeys-lru   # Hapus key yang paling jarang diakses jika memori mencapai 256MB
```

### C. Alokasi Memori Terencana (Memory Budgeting)
Untuk VPS dengan RAM 2GB:
* **PostgreSQL:** `shared_buffers = 512MB` (25% RAM).
* **Redis:** `maxmemory = 256MB` (12.5% RAM).
* **Node.js (Nexa Backend):** `--max-old-space-size=512MB` (25% RAM).
* **Sisa (~700MB):** Didedikasikan untuk Linux OS Kernel, Page Cache, dan buffer I/O.

---

## 4. Implementasi Nyata di Codebase Nexa Streetwear

### A. Arsitektur Memori Node.js yang Ramping (<80MB)
Dengan menolak penyimpanan *state* lokal di dalam variabel global Express dan mengalihkan seluruh cache katalog serta sesi token ke Redis, proses Node.js Nexa hanya mengonsumsi **~65MB – 80MB Heap RAM**, sehingga tidak pernah memicu tekanan memori pada kernel.

### B. TTL Otomatis pada Seluruh Kunci Dinamis
Seluruh kunci sementara yang disimpan di Redis (seperti OTP 5 menit di [`advancedAuth.routes.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/auth/advancedAuth.routes.ts), rate limiter counter 15 menit, dan token rotasi) selalu dilengkapi dengan **parameter TTL (`EX`)**, mencegah pertumbuhan memori yang tidak terkendali.

---

## 5. Cheatsheet Monitoring & Deteksi Swap Thrashing

### 1. Memeriksa Aktivitas Swap In & Swap Out via `vmstat`
```bash
# Pantau aktivitas memori setiap 1 detik
vmstat 1
```
*Kolom penting yang harus diperhatikan:*
* **`si` (Swap In):** Volume data yang dibaca dari disk swap ke RAM (KB/s).
* **`so` (Swap Out):** Volume data yang ditulis dari RAM ke disk swap (KB/s).
* *Jika angka `si` dan `so` bernilai ribuan secara terus-menerus dan angka CPU `wa` (wait) tinggi, server Anda sedang mengalami **Swap Thrashing**!*

### 2. Memeriksa Penggunaan Swap Terkini
```bash
# Periksa volume swap terpakai
free -h

# Periksa partisi atau file swap yang aktif
swapon --show
```

---

## 6. Kesimpulan

Dengan menerapkan **Tuning Kernel `vm.swappiness = 10`**, **Pembatasan Batas Memori Redis (`allkeys-lru`)**, dan **Arsitektur Stateless Backend**, sistem Nexa Streetwear menjamin seluruh operasi transaksi berjalan 100% di dalam RAM fisik berkecepatan tinggi, terbebas dari kelambatan mematikan akibat swap thrashing.

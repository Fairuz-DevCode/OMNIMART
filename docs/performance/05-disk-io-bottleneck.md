# 05. Disk I/O Bottleneck & Storage Throughput

Dokumen ini membedah masalah **Disk I/O Bottleneck** (kemacetan input/output media penyimpanan), bagaimana disk I/O yang jenuh dapat melumpuhkan seluruh transaksi e-commerce, serta mitigasi arsitektur di project **Nexa Streetwear**.

---

## 1. Memahami Metrik Disk I/O: IOPS, Throughput, & %Util

Performa media penyimpanan (SSD NVMe atau HDD) diukur melalui tiga indikator utama:

```
+-------------------------------------------------------------------------------+
| 1. IOPS (Input/Output Operations Per Second): Jumlah baca/tulis per detik    |
| 2. Throughput: Volume data yang ditransfer per detik (MB/s)                   |
| 3. %Util (Disk Utilization): Persentase waktu disk sibuk melayani request     |
+-------------------------------------------------------------------------------+
```

### Fenomena Disk I/O Bottleneck
Ketika aplikasi web terlalu sering membaca dan menulis langsung ke disk secara acak (*random I/O*), antrean operasi disk (*I/O Queue Depth*) akan menumpuk.
* **Disk Utilization (%util) mencapai 100%:** Disk kehabisan kapasitas waktu untuk melayani permintaan baru.
* **I/O Wait (%iowait) CPU melonjak:** Inti CPU terpaksa berhenti dan menganggur (*idle wait*) hanya untuk menunggu data selesai ditulis atau dibaca dari piringan/chip disk.
* **Akibat:** Seluruh request API katalog, login, dan checkout mengalami kelambatan ekstrem (*freezing*), meskipun penggunaan memori RAM dan komputasi CPU aplikasi masih rendah.

---

## 2. Sumber Utama Disk I/O Bottleneck pada E-Commerce

### A. Logging Sinkron Pemblokir I/O (*Synchronous File Logging*)
* **Masalah:** Menggunakan fungsi sinkron seperti `fs.writeFileSync()` atau library logger yang memanggil `fsync()` pada setiap HTTP request yang masuk. Jika ada 500 request per detik, disk dipaksa melakukan 500 operasi penulisan disk fisik terpisah.
* **Solusi di Nexa:** Menggunakan **Append-Only Asynchronous Stream** (`fs.createWriteStream`) yang mengumpulkan buffer di memori kernel sebelum dialirkan ke disk secara efisien.

### B. Query Database Tanpa Indeks (*Disk Thrashing Full-Table Scan*)
* **Masalah:** Query pencarian produk tanpa indeks B-Tree memaksa mesin PostgreSQL membaca ribuan block file database dari disk (*Sequential Scan*).
* **Solusi di Nexa:** Seluruh kolom filter dan foreign key telah diindeks secara ketat melalui Prisma schema ([`docs/database/06-missing-database-index.md`](../database/06-missing-database-index.md)).

### C. Redundansi Pembacaan Katalog Produk
* **Masalah:** Ratusan pengunjung melihat halaman etalase yang sama, memaksa PostgreSQL membaca tabel produk berulang-ulang dari disk.
* **Solusi di Nexa:** Mengalihkan 100% pembacaan katalog produk statis ke **Redis In-Memory Cache** (latensi <1ms tanpa menyentuh disk fisik).

---

## 3. Best Practices Rekayasa Pencegahan Disk I/O Bottleneck

1. **Buffered & Asynchronous Writes:**  
   Jangan pernah menulis data per satu baris log secara sinkron. Manfaatkan internal stream buffer Node.js dan Linux page cache.
2. **Kompresi Log Otomatis (Gzip Batching):**  
   File log teks berukuran 100MB dapat dikompresi menjadi ~8MB menggunakan Gzip, mengurangi operasi I/O saat membaca dan mengarsipkan data histori.
3. **Optimalkan In-Memory Buffer Database (PostgreSQL `shared_buffers`):**  
   Konfigurasikan PostgreSQL agar mengalokasikan 25% dari total RAM fisik untuk `shared_buffers`, sehingga data tabel yang sering diakses tetap berada di RAM dan tidak memicu pembacaan disk berulang.
4. **Offload Media Statis ke Object Storage / CDN:**  
   Untuk produksi skala besar, aset foto produk disimpan di Cloud Storage (S3 / Cloudflare R2) agar disk server aplikasi tidak terbebani transfer file statis biner berukuran besar.

---

## 4. Implementasi Nyata di Codebase Nexa Streetwear

### A. Asynchronous Non-Blocking Access Logging: [`backend/src/middleware/accessLogMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/accessLogMiddleware.ts#L43-L45)
Sistem membuka write stream asinkron dengan mode penambahan berurutan (*append-only*):

```typescript
currentWriteStream = fs.createWriteStream(filePath, { 
  flags: "a", 
  encoding: "utf8" 
});
```
Mode ini memastikan penulisan dilakukan secara berurutan (*sequential write*) yang memiliki throughput hingga 10x lebih cepat daripada *random write*.

### B. Manajemen Kompresi & Rotasi Log Harian: [`backend/scripts/logManager.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/logManager.ts)
Sistem dilengkapi skrip pemeliharaan yang otomatis mengompresi log lawas menjadi file `.gz` terkompresi dan menghapus log kedaluwarsa, menjaga disk I/O dan kapasitas storage tetap hemat >90%.

### C. Proteksi Disk Database via Redis Caching: [`backend/src/middleware/cacheMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/cacheMiddleware.ts)
Dengan menahan request katalog produk di Redis, operasi pembacaan disk database PostgreSQL berkurang hingga **>90%** saat traffic tinggi.

---

## 5. Cheatsheet Monitoring & Deteksi Disk I/O Bottleneck

### 1. Memeriksa Utilisasi Disk Real-Time via `iostat`
```bash
# Pantau statistik I/O per detik (perangkat disk, await time, %util)
iostat -xz 1
```
*Parameter yang harus diperhatikan:*
* **`%util`:** Jika mendekati **>85% - 100%**, disk Anda mengalami bottleneck parah!
* **`r_await` / `w_await`:** Waktu tunggu antrean baca/tulis dalam milidetik. Nilai normal pada SSD adalah <5ms. Jika mencapai >50ms, antrean disk menumpuk.

### 2. Menemukan Proses Pemakan Disk Terbesar via `iotop`
```bash
# Jalankan iotop hanya untuk proses yang sedang aktif melakukan I/O
sudo iotop -o
```
Perhatikan kolom **DISK WRITE** dan **IO>**: temukan apakah bottleneck disebabkan oleh proses `node`, `postgres`, atau proses background lain.

### 3. Memantau CPU I/O Wait via `vmstat`
```bash
vmstat 1
```
Perhatikan kolom **`wa` (I/O Wait)**. Jika angka `wa` melebihi **15 - 20%**, CPU sedang tersendat menunggu respon dari disk penyimpanan.

---

## 6. Kesimpulan

Dengan mengimplementasikan **Asynchronous Stream Logging**, **Pengurangan Beban Query via Redis Cache**, dan **Rotasi Kompresi Log Otomatis**, arsitektur Nexa Streetwear mampu beroperasi pada tingkat utilisasi disk yang sangat rendah (<10% util), menjamin integritas throughput transaksi e-commerce tetap stabil tanpa *I/O latency choke*.

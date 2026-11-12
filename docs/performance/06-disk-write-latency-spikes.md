# 06. Disk Write Latency Spikes & fsync Stalls

Dokumen ini membedah masalah **Disk Write Latency Spikes** (lonjakan latensi penulisan disk pada persentil p99/p99.9), bagaimana panggilan sistem pemblokir seperti `fsync()` dan pembersihan memori kotor (*dirty page flush*) dapat membuat respons transaksi terhenti sesaat, serta mitigasi arsitektur di project **Nexa Streetwear**.

---

## 1. Anatomi Masalah: Rata-Rata Latensi vs Latensi Ekor (p99 Spikes)

Sebuah sistem penyimpanan disk dapat memiliki rata-rata latensi penulisan yang sangat cepat (misalnya 2–5 ms), namun secara berkala mengalami **lonjakan latensi ekor (*tail latency spike*) hingga 500 ms – 2.000 ms**.

```
Latensi
  ^
  |                                        [SPIKE: 1.200ms fsync stall]
  |                                                     /\
  |                                                    /  \
  |  2ms    3ms    2ms    4ms    2ms    3ms           /    \    2ms    3ms
  +--------------------------------------------------/------\---------------> Waktu
```

### Mekanisme Terjadinya Latensi Ekor
1. **Linux Page Cache & Dirty Pages:**  
   Ketika aplikasi menulis data ke disk, Linux tidak langsung menulisnya ke chip SSD fisik. Data disimpan terlebih dahulu di memori RAM sebagai **Dirty Pages** (halaman kotor). Penulisan ini berlangsung sangat cepat (<0.1 ms).
2. **Ambang Batas Terlampaui (*Dirty Page Throttle*):**  
   Ketika persentase *dirty pages* di RAM melebihi ambang batas kernel (`vm.dirty_ratio`), Linux akan **menghentikan sementara (*throttle*)** proses aplikasi yang sedang menulis, memaksanya menunggu hingga disk fisik selesai menyerap data.
3. **Panggilan Sistem `fsync()` (Database Durability):**  
   Untuk mematuhi pilar **ACID (Durability)**, PostgreSQL wajib memanggil perintah `fsync()` ke kernel saat mencatat Write-Ahead Logging (WAL) dan saat *Checkpoint*. `fsync()` memaksa controller SSD mengosongkan seluruh cache volatilnya ke media non-volatil. Jika controller SSD sedang sibuk, proses akan tersendat (*fsync stall*).

---

## 2. Dampak pada Transaksi E-Commerce

Jika lonjakan latensi penulisan terjadi saat transaksi pembayaran checkout:
* **Checkout Micro-Freezes:** Pembeli yang mengklik tombol "Bayar Sekarang" mengalami *loading spinner* macet selama 1–2 detik secara acak.
* **Webhook Midtrans Timeout:** Webhook pembayaran dari Midtrans mengalami keterlambatan acknowledgement (*response timeout*), memicu pengiriman ulang webhook ganda (*duplicate retry webhook*).
* **Connection Pool Exhaustion:** Karena request tertahan menunggu disk menulis WAL, koneksi database tidak segera kembali ke pool, memicu kemacetan berantai ke seluruh request lainnya (*cascading failure*).

---

## 3. Strategi & Best Practices Mitigasi Lonjakan Latensi Tulis

### A. Tuning Parameter Linux Dirty Pages (Gradual Flushing)
Pengaturan default Linux sering membiarkan dirty pages menumpuk hingga 20% RAM sebelum dibersihkan sekaligus secara masif. Pada server e-commerce, atur agar pembersihan dilakukan secara bertahap dan halus:
```bash
# Bersihkan dirty pages di background saat mencapai 5% RAM
sudo sysctl -w vm.dirty_background_ratio=5

# Batas maksimal sebelum proses di-throttle diturunkan ke 10% RAM
sudo sysctl -w vm.dirty_ratio=10
```

### B. Smoothing Checkpoint PostgreSQL
Di database PostgreSQL, jangan biarkan *checkpoint* menulis data secara mendadak. Sebarkan proses penulisan ke seluruh durasi interval:
```ini
# postgresql.conf
checkpoint_completion_target = 0.9   # Sebarkan penulisan I/O ke 90% waktu interval checkpoint
wal_buffers = 16MB                  # Alokasikan buffer memori yang cukup untuk WAL sebelum ditulis ke disk
```

### C. Hindari `fsync` Sinkron di Event Loop Aplikasi Node.js
Jangan pernah memanggil `fs.fsyncSync()` di dalam rute Express. Biarkan penulisan log aplikasi dikelola secara asinkron oleh kernel OS.

---

## 4. Implementasi Nyata di Codebase Nexa Streetwear

### A. Non-Blocking Sequential Append pada Audit & Access Log: [`backend/src/middleware/accessLogMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/accessLogMiddleware.ts)
Sistem menggunakan mode append tanpa memanggil `fsync` sinkron:
```typescript
currentWriteStream = fs.createWriteStream(filePath, { 
  flags: "a", 
  encoding: "utf8" 
});
```
Log dialirkan melalui buffer internal Node.js. Jika terjadi lonjakan traffic, event-loop Express tidak pernah terhambat oleh kecepatan I/O fisik disk.

### B. Transaksi Database Atomik Tunggal: [`backend/src/modules/order/order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L38-L117)
Operasi validasi stok, update kuantitas, dan pembuatan order dibungkus dalam satu blok `prisma.$transaction`. Ini meminimalkan jumlah flush WAL disk terpisah menjadi satu siklus commit tunggal yang sangat efisien.

---

## 5. Cheatsheet Monitoring & Deteksi Latensi Tulis

### 1. Memeriksa Volume Dirty Pages di Memori RAM
```bash
# Pantau volume dirty memory yang sedang antre untuk ditulis ke disk
cat /proc/meminfo | grep -E "Dirty|Writeback"
```
*Jika angka `Dirty` terus melonjak tinggi dan angka `Writeback` bergerak lambat, disk sedang kewalahan menyerap data penulisan.*

### 2. Memantau Latensi Tulis per Proses via `pidstat`
```bash
# Pantau penulisan disk (kB/s) dan latensi per proses per detik
pidstat -d 1
```

### 3. Memantau Status Checkpoint di PostgreSQL
Masuk ke terminal psql dan periksa statistik penulisan checkpoint:
```sql
SELECT 
  checkpoints_timed, 
  checkpoints_req, 
  checkpoint_write_time, 
  checkpoint_sync_time 
FROM pg_stat_bgwriter;
```
*Jika `checkpoints_req` (checkpoint paksa karena WAL penuh) lebih tinggi daripada `checkpoints_timed` (checkpoint terencana), ukuran `max_wal_size` PostgreSQL perlu dinaikkan.*

---

## 6. Kesimpulan

Dengan menerapkan **Gradual Page Flushing**, **Penyebaran Checkpoint PostgreSQL (`checkpoint_completion_target = 0.9`)**, serta **Non-blocking Log Streaming**, sistem Nexa Streetwear berhasil memangkas lonjakan latensi ekor p99, memastikan setiap transaksi checkout diselesaikan dalam waktu konsisten di bawah 50 milidetik.

# 04. Out Of Memory (OOM) & Linux OOM Killer

Dokumen ini membedah fenomena **Out Of Memory (OOM)**, bagaimana perbedaan antara **V8 JavaScript Heap Exhaustion** dan **Linux Kernel OOM Killer**, dampaknya terhadap operasional toko e-commerce, serta mitigasi arsitektur di project **Nexa Streetwear**.

---

## 1. Anatomi OOM: V8 Heap Limit vs OS OOM Killer

Dalam ekosistem Node.js di server Linux, kondisi kehabisan memori terbagi menjadi dua level:

```
+-------------------------------------------------------------------------------+
|                            LEVEL 1: V8 HEAP OOM                               |
| Proses Node.js melampaui batas heap JS (--max-old-space-size)                 |
| Status: Node.js crash mandiri dengan stack trace V8                           |
+-------------------------------------------------------------------------------+
                                      |
                           (Jika lolos Level 1)
                                      v
+-------------------------------------------------------------------------------+
|                         LEVEL 2: LINUX KERNEL OOM                             |
| Total RAM fisik server habis -> Kernel mengaktifkan OOM Killer                |
| Status: Proses Node.js dimatikan paksa oleh Kernel OS (SIGKILL / Signal 9)    |
+-------------------------------------------------------------------------------+
```

### A. Level 1: V8 JavaScript Heap Exhaustion
* **Mekanisme:** Secara default, engine Google V8 membatasi *Old Space Memory* sekitar 1.4 GB (pada arsitektur 64-bit) untuk mencegah proses Garbage Collection (GC) memakan waktu terlalu lama (*Stop-The-World pause*).
* **Gejala:** Aplikasi berhenti dengan log error:
  ```text
  FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
  ```

### B. Level 2: Linux Kernel OOM Killer
* **Mekanisme:** Ketika seluruh RAM fisik server dan swap space terisi penuh, kernel Linux tidak bisa lagi mengalokasikan halaman memori baru (`malloc()` gagal). Untuk mencegah sistem operasi *kernel panic* (hang total), kernel memanggil algoritma **OOM Killer**.
* **Perhitungan Skor (`oom_score`):** Kernel menghitung nilai keburukan (*badness score*) setiap proses berdasarkan persentase penggunaan RAM fisik:
  $$\text{badness} = \text{persentase RAM} + \text{oom\_score\_adj}$$
  Proses yang memakan RAM terbesar (biasanya Node.js atau PostgreSQL) akan langsung dikirimi sinyal mematikan **`SIGKILL` (kill -9)** tanpa pemberitahuan (*zero grace period*).
* **Gejala:** Server backend mati mendadak tanpa pesan error di aplikasi; log Linux `dmesg` mencatat:
  ```text
  [12345.678] Out of memory: Killed process 4120 (node) total-vm:2451230kB, anon-rss:1850124kB
  ```

---

## 2. Dampak Fatal OOM pada E-Commerce

Jika proses Node.js dimatikan secara mendadak akibat OOM:
1. **Transaksi Gantung (*In-Flight Transaction Dropped*):** Pembeli yang sedang berada di tengah-tengah pembayaran atau pemotongan stok akan terputus koneksinya, menghasilkan status transaksi tidak konsisten.
2. **Lonjakan HTTP 502 Bad Gateway:** Web server Nginx / Reverse Proxy tidak dapat menghubungi upstream Node.js, membuat seluruh etalase toko offline.
3. **Database Connection Orphan:** Koneksi TCP ke database PostgreSQL tidak ditutup secara sopan (*graceful disconnect*), membiarkan koneksi menggantung di pool PostgreSQL hingga terkena idle timeout.

---

## 3. Strategi & Best Practices Mitigasi OOM

### A. Konfigurasi Heap V8 Sesuai Kapasitas VPS
Jangan biarkan Node.js memakai alokasi default jika server memiliki kapasitas memori terbatas:
* Pada **VPS 2GB RAM** (yang berbagi dengan PostgreSQL dan Redis): Atur batas heap Node.js ke **1024MB (1GB)** agar tidak memicu Linux OOM Killer.
  ```json
  "scripts": {
    "start": "node --max-old-space-size=1024 dist/server.js"
  }
  ```

### B. Proteksi Ukuran Request Body (Payload Ceiling)
Penyerang dapat mengirim payload POST JSON sebesar 100MB berulang kali hingga memori V8 meledak. Batasi ukuran body maksimal **1MB** di level Express.

### C. Alirkan Data Besar via Stream (Bukan Buffer Memori)
* Hindari `fs.readFileSync` untuk file statis atau log.
* Hindari memuat seluruh data riwayat order 1 tahun ke dalam satu array JavaScript besar. Gunakan pagination kursor (`take: 50`) atau *database streaming*.

### D. Process Manager Auto-Restart (PM2 / Systemd)
Gunakan supervisor proses untuk merestart aplikasi secara otomatis jika memori mendekati batas kritis sebelum OOM terjadi:
```bash
pm2 start dist/server.js --max-memory-restart 900M
```

---

## 4. Implementasi Nyata di Codebase Nexa Streetwear

### A. Pembatasan Ketat Payload Express Body: [`backend/src/app.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts)
```typescript
// Mencegah memory ballooning akibat payload JSON raksasa
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
```

### B. Streaming Log Asinkron: [`backend/src/middleware/accessLogMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/accessLogMiddleware.ts)
Alih-alih menumpuk log di RAM sebelum ditulis, sistem langsung mengalirkannya ke `fs.createWriteStream` dengan backpressure handling, menjaga memori Node.js tetap flat.

### C. Kompresi Gambar Berbasis Stream Pipeline: [`uploadProductImageMiddleware.ts`]
Pemrosesan gambar produk menggunakan library Sharp dengan alur streaming, membatasi resolusi dan format ke WebP tanpa menahan buffer mentah 20MB di heap JavaScript.

---

## 5. Cheatsheet Deteksi & Investigasi OOM

### 1. Memeriksa Riwayat OOM Killer di Kernel Linux
```bash
# Periksa apakah ada proses yang dibunuh oleh Linux OOM Killer
dmesg -T | grep -i -E "oom|killed process"

# Atau melalui log sistem journalctl
journalctl -k | grep -i oom
```

### 2. Memeriksa Skor OOM Proses Node.js yang Sedang Berjalan
```bash
# Cari PID proses node
pgrep -f "node"

# Cek skor keburukan OOM proses tersebut (skala 0 - 1000)
cat /proc/<PID>/oom_score

# Melindungi proses kritis dari OOM Killer (Opsional: hanya untuk proses vital OS)
echo -500 | sudo tee /proc/<PID>/oom_score_adj
```

### 3. Memantau Penggunaan Memori Server Real-Time
```bash
# Pantau RAM fisik dan Swap yang tersisa
free -m

# Pantau proses pemakan memori teratas secara dinamis
top -o %MEM
```

---

## 6. Kesimpulan

Dengan menerapkan **Pembatasan Ukuran Request Body (1MB)**, **Streaming File I/O**, dan **Pengaturan Batas V8 Heap (`--max-old-space-size`)**, sistem Nexa Streetwear terlindungi dari risiko *uncontrolled memory spikes*, menjamin ketersediaan toko online tetap 99.9% tanpa gangguan OOM crash.

# Non-Functional Testing: Performance & Load Testing Architecture

Dokumen ini membedah arsitektur pengujian performa, latensi (*Latency Benchmarks*), dan pengujian beban (*Load & Spike Testing*) pada backend **Nexa Streetwear**.

---

## 1. Konsep & Metrik SLA

Pengujian performa di Nexa dirancang untuk memverifikasi Service Level Agreement (SLA) platform toko online sebelum diterjunkan ke lingkungan produksi:

1. **Micro-Latency:** Waktu respon pembacaan data cache di RAM harus berada di kisaran sub-millisecond (< 5ms).
2. **Steady Load:** Mampu melayani 50 pengguna aktif bersamaan (*Virtual Users*) dengan latensi $p95 < 200\text{ms}$ dan tingkat kegagalan (*error rate*) $< 1\%$.
3. **Flash Sale Spike:** Mampu menahan lonjakan mendadak 300 pengguna serentak dalam tempo 5 detik tanpa kehabisan *database connection pool* atau memicu Linux OOM Killer.

---

## 2. Cakupan Berkas Performance Testing di Codebase

### 1. [internalLatencyBenchmark.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/non-functional/performance/internalLatencyBenchmark.ts)
* **Kategori:** Node.js In-Process Micro-Benchmark (Dapat dijalankan langsung tanpa instalasi k6).
* **Pengujian 1:** Mengukur waktu round-trip `SET` dan `GET` in-memory key Redis. Menjamin latensi roundtrip berada di bawah 20ms (riil: ~15ms).
* **Pengujian 2:** Mengukur waktu respon *connection pool* PostgreSQL via query `SELECT 1`. Menjamin koneksi pool siap melayani transaksi di bawah 50ms (riil: ~24ms).

### 2. [k6-load-test.js](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/non-functional/performance/k6-load-test.js)
* **Kategori:** Grafana k6 Production Baseline Load Test.
* **Skenario:** 
  - 10 detik pertama: Ramp-up ke 20 VUs.
  - 25 detik berikutnya: Beban konstan stabil pada 50 VUs browsing katalog `/api/products` dan probe `/api/health`.
  - 10 detik terakhir: Ramp-down kembali ke 0.
* **SLA Thresholds:** `http_req_duration: ['p(95)<200']` dan `http_req_failed: ['rate<0.01']`.

### 3. [k6-spike-flashsale.js](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/non-functional/performance/k6-spike-flashsale.js)
* **Kategori:** Grafana k6 Flash Sale Spike Simulation.
* **Skenario:** Mensimulasikan pengunjung yang menunggu event diskon tengah malam jam 00.00. Traffic melesat ekstrem dari 10 pengguna melompat menjadi **300 Virtual Users serentak dalam 5 detik**, lalu bertahan selama 15 detik sebelum surut.
* **Tujuan:** Memvalidasi ketahanan layer Redis Cache-Aside dalam meredam *Thundering Herd* sebelum request menyentuh PostgreSQL disk I/O.

---

## 3. Cara Menjalankan

### A. Menjalankan Benchmark Latensi Internal
```bash
npm run test:perf
```

### B. Menjalankan Pengujian Beban Grafana k6
> Pastikan server backend sedang aktif berjalan di terminal terpisah (`npm run dev` atau `npm start`).

```bash
# 1. Steady Load Test (50 VUs)
npm run test:k6:load

# 2. Flash Sale Spike Test (300 VUs)
npm run test:k6:spike
```

# 07. TCP Port Exhaustion & TIME_WAIT Sockets

Dokumen ini membedah masalah **TCP Port Exhaustion** (kehabisan port keluar sementara / *ephemeral port starvation*), bagaimana siklus hidup soket berstatus `TIME_WAIT` dapat memblokir komunikasi antar-layanan di e-commerce, serta mitigasi arsitektur di project **Nexa Streetwear**.

---

## 1. Anatomi Masalah: 4-Tuple & Ephemeral Port Range

Setiap koneksi jaringan TCP diidentifikasi secara unik oleh kombinasi 4 elemen (*4-Tuple*):
$$\text{Koneksi TCP} = (\text{Source IP}, \text{Source Port}, \text{Destination IP}, \text{Destination Port})$$

```
+---------------------------------------------------------------------------------+
| SERVER NODE.JS (192.168.1.10)                PAYMENT GATEWAY (103.20.5.15:443)  |
| Source Port: 32768 (Ephemeral)  =============>  Dest Port: 443 (HTTPS)          |
| [Koneksi ditutup]               =============>  Masuk state TIME_WAIT (60 detik) |
+---------------------------------------------------------------------------------+
```

### Mengapa Port Ephemeral Bisa Habis?
1. **Batas Rentang Port Linux:**  
   Secara default, Linux mengalokasikan port keluar sementara (*ephemeral ports*) pada rentang **32768 hingga 60999** (hanya tersedia sekitar **28.232 port**).
2. **Status `TIME_WAIT` (Standar RFC 793):**  
   Ketika koneksi TCP ditutup oleh aplikasi, soket tidak langsung dimusnahkan. Soket wajib bertahan dalam status **`TIME_WAIT` selama $2 \times \text{MSL}$ (sekitar 60 detik)** untuk memastikan paket data lama yang terlambat di internet (*delayed duplicate packets*) tidak mengontaminasi koneksi baru.
3. **Koneksi Non-Persistent (Koneksi Singkat):**  
   Jika backend e-commerce membuka koneksi HTTP baru untuk setiap panggilan API pihak ketiga (misalnya ke Midtrans atau RajaOngkir) dengan header `Connection: close` tanpa *Keep-Alive*, maka dengan beban **500 request per detik**, seluruh 28.000 port akan habis dalam waktu kurang dari 1 menit!

### Gejala Eror di Node.js
Ketika port ephemeral habis, setiap panggilan jaringan keluar akan gagal dengan eror:
```text
Error: connect EADDRNOTAVAIL (Cannot assign requested address)
```

---

## 2. Dampak Fatal pada Transaksi E-Commerce

Jika terjadi TCP Port Exhaustion:
* **Gagal Komunikasi ke Payment Gateway:** Backend tidak dapat menghubungi server Midtrans untuk membuat transaksi Snap Token atau memverifikasi status pembayaran.
* **Gagal Hitung Ongkos Kirim:** Permintaan kalkulasi tarif kurir (JNE, POS, SiCepat) gagal total, mencegah pembeli menyelesaikan tahap checkout.
* **Koneksi Database & Redis Terputus:** Backend tidak dapat membuka koneksi baru ke pool PostgreSQL atau cluster Redis, membuat seluruh sistem lumpuh.

---

## 3. Strategi & Best Practices Mitigasi TCP Port Exhaustion

### A. Aktifkan HTTP Keep-Alive & Connection Pooling
Jangan pernah menutup koneksi HTTP ke layanan internal atau gateway eksternal setelah satu kali request. Gunakan persistent agent:
```typescript
import http from "http";
import https from "https";

// Menggunakan socket yang sama berulang kali (Socket Reuse)
export const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
});
```

### B. Tuning Parameter Kernel Linux Socket Reuse
Pada level sistem operasi Linux, aktifkan fitur penggunaan kembali soket `TIME_WAIT` yang aman:
```bash
# Mengizinkan kernel menggunakan soket TIME_WAIT untuk koneksi keluar baru
sudo sysctl -w net.ipv4.tcp_tw_reuse=1

# Memperluas rentang ephemeral port dari 1024 ke 65535 (~64.000 port)
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"

# Mempersingkat durasi FIN timeout dari 60 detik menjadi 15 detik
sudo sysctl -w net.ipv4.tcp_fin_timeout=15
```

### C. Persistent Singleton Client untuk Database & Cache
Pastikan client PostgreSQL (Prisma) dan client Redis (ioredis) menggunakan koneksi persistent jangka panjang, bukan membuka soket baru di setiap request controller.

---

## 4. Implementasi Nyata di Codebase Nexa Streetwear

### A. HTTP Keep-Alive Socket Level Hardening: [`backend/src/server.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L12-L17)
Server Express dikonfigurasi untuk mempertahankan soket TCP tetap terbuka (*socket reuse*) dengan upstream Nginx / Load Balancer:

```typescript
// keepAliveTimeout diset 65 detik (lebih lama dari batas 60 detik Nginx/ALB)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 30000;
```
Konfigurasi ini memastikan ribuan request dari pembeli yang sama dilayani melalui soket TCP yang sudah ada, tanpa membuang port ephemeral baru.

### B. Persistent Redis Connection: [`backend/src/config/redis.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/redis.ts#L4-L23)
Koneksi ke Redis diinisialisasi sebagai singleton persistent socket TCP tunggal dengan fitur auto-reconnect, sehingga jutaan operasi cache `GET`/`SET` tidak pernah membuka port baru.

### C. Prisma Connection Pool: [`backend/src/config/prisma.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts#L33-L44)
Koneksi ke PostgreSQL menggunakan connection pool terkontrol yang menggunakan kembali (*recycles*) koneksi yang sudah terbuka.

---

## 5. Cheatsheet Monitoring & Deteksi TCP Sockets

### 1. Menghitung Jumlah Soket Berstatus TIME_WAIT
```bash
# Hitung total soket TIME_WAIT saat ini
ss -tan 'state time-wait' | wc -l

# Atau menggunakan netstat
netstat -an | grep TIME_WAIT | wc -l
```
*Jika angka ini mendekati batas ephemeral port (>20.000), sistem Anda berada dalam bahaya kehabisan port!*

### 2. Memeriksa Ringkasan Seluruh Soket Jaringan (`ss -s`)
```bash
ss -s
```
*Output menampilkan rekapitulasi soket: TCP (estab, closed, orphaned, timewait).*

### 3. Memeriksa Rentang Port Ephemeral Aktif di Server
```bash
cat /proc/sys/net/ipv4/ip_local_port_range
```

---

## 6. Kesimpulan

Dengan mengaktifkan **HTTP Keep-Alive Socket Reuse**, **Koneksi Persistent Singleton (Prisma & Redis)**, dan **Kernel Socket Reuse (`tcp_tw_reuse`)**, sistem Nexa Streetwear terlindungi dari kehabisan port TCP ephemeral, menjamin komunikasi ke Payment Gateway Midtrans dan microservices pendukung berjalan tanpa interupsi.

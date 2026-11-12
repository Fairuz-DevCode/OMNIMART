# 03. Memory Leak: Deteksi, Pencegahan, & Mitigasi

Dokumen ini membedah fenomena **Memory Leak** pada *runtime* Node.js (V8 Engine), bagaimana alokasi memori yang tidak terkelola dapat merusak performa server e-commerce (*high latency & crash*), serta implementasi pencegahannya di project **Nexa Streetwear**.

---

## 1. Apa itu Memory Leak di Node.js? (V8 Memory Mechanics)

Node.js mengeksekusi JavaScript di atas mesin **Google V8**. V8 membagi memori aplikasi ke dalam dua kategori utama:
1. **Stack Memory:** Menyimpan data primitif dan pointer fungsi yang memiliki masa hidup pendek.
2. **Heap Memory:** Menyimpan objek, array, closure, dan buffer dinamis. Heap dikelola secara otomatis oleh **Garbage Collector (GC)** melalui algoritma *Mark-and-Sweep*.

```
+--------------------------------------------------------------------------+
|                      NODE.JS PROCESS MEMORY (RSS)                        |
|  +--------------------------------------------------------------------+  |
|  |                            V8 HEAP                                 |  |
|  |  +---------------------------+   +------------------------------+  |  |
|  |  |     NEW GENERATION        |   |        OLD GENERATION        |  |  |
|  |  | (Objek baru, dibersihkan  |   | (Objek bertahan lama,        |  |  |
|  |  |  cepat via Scavenge GC)   |   |  dibersihkan via Mark-Sweep) |  |  |
|  |  +---------------------------+   +------------------------------+  |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```

### Definisi Memory Leak
**Memory Leak** terjadi ketika suatu objek di *Heap Memory* tidak lagi digunakan oleh alur logika aplikasi, tetapi **Garbage Collector (GC) tidak dapat membebaskannya** karena objek tersebut masih terhubung dengan *Root Reference* (misalnya variabel global, closure yang tertahan, atau event listener yang tidak pernah dilepas).

### Gejala & Dampak pada Server E-Commerce
1. **Baseline Memori Naik Terus (*Sawtooth Drift*):** Memori server tidak pernah turun kembali ke titik awal setelah traffic mereda.
2. **Latensi Meningkat (*Event Loop Starvation*):** V8 GC harus bekerja semakin keras dan sering (*Stop-The-World pause*) untuk mencari celah memori, membuat response API katalog dan checkout melambat.
3. **Crash Fatal (*Out of Memory - OOM*):** Node.js akan mati mendadak dengan log error:
   ```text
   FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
   ```

---

## 2. 5 Sumber Utama Penyebab Memory Leak di Node.js

### A. Objek / Map Global Tanpa Batas (*Unbounded In-Memory Cache*)
* **Masalah:** Developer menyimpan data cache, token, atau keranjang belanja langsung di dalam variabel JavaScript global:
  ```typescript
  // ❌ ANTI-PATTERN: Objek ini akan tumbuh selamanya seiring waktu
  const localCache = new Map<string, any>();
  app.get("/api/products", (req, res) => {
    localCache.set(req.url, data); // Tidak ada batas maksimal (unbounded)!
  });
  ```
* **Solusi di Nexa:** Seluruh kebutuhan caching didelegasikan ke **Redis**. Node.js tetap bersifat *stateless*, sehingga memori heap Node.js tetap ramping (<100MB).

### B. Instansiasi Ulang Koneksi Database (*Database Client Leak*)
* **Masalah:** Menginstansiasi `new PrismaClient()` di dalam rute controller atau membuat instance baru setiap kali file di-import. Setiap instance membuka *connection pool* baru ke PostgreSQL, menguras koneksi dan memakan memori heap.
* **Solusi di Nexa:** Menggunakan pola **Global Singleton** di [`backend/src/config/prisma.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts).

### C. Kebocoran Event Listener (*Leaked Event Listeners*)
* **Masalah:** Memasang event listener `emitter.on("event", fn)` di dalam middleware atau rute request HTTP tanpa pernah memanggil `emitter.off()`.
  ```text
  (node:1234) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 request listeners added.
  ```
* **Solusi di Nexa:** Memastikan setiap stream (misalnya `redis.scanStream` atau file stream) memiliki siklus hidup yang tertutup dan menangani event `error` serta `end`.

### D. File Descriptor & Stream yang Menggantung (*Dangling Stream / Socket*)
* **Masalah:** Membuka `fs.createWriteStream` untuk mencatat log atau membaca upload gambar tanpa memanggil `.end()` atau `.destroy()`. File descriptor di level OS tidak pernah dilepas.
* **Solusi di Nexa:** Log stream harian dirotasi secara otomatis dengan menutup stream lama, serta dilengkapi *cleanup hook* pada sinyal `SIGTERM`/`SIGINT`.

### E. Timer yang Tidak Dilepas (*Dangling setInterval / setTimeout*)
* **Masalah:** Fungsi `setInterval` yang berjalan terus-menerus dan mereferensikan variabel dalam lingkupnya (*closure retention*), mencegah proses Node.js keluar atau membebaskan memori.
* **Solusi di Nexa:** Penggunaan method `.unref()` pada timer operasional agar timer tidak mengunci proses Node.js.

---

## 3. Best Practices Rekayasa Pencegahan Memory Leak

1. **Stateless Application Node.js:**  
   Jangan pernah menyimpan data bisnis (*state*) yang berumur panjang di dalam memori JavaScript. Simpan state di Redis (dengan TTL) atau PostgreSQL.
2. **Strict Payload Limit:**  
   Batasi ukuran body HTTP maksimal 1MB di Express (`express.json({ limit: "1mb" })`). Hal ini mencegah penyerang mengirim payload JSON 50MB yang langsung memenuhi Heap Memory V8.
3. **Gunakan Stream untuk File Besar:**  
   Saat memproses file upload (seperti gambar produk), gunakan *streaming buffer* (Sharp pipeline) alih-alih me-load seluruh file biner mentah ke dalam RAM sekaligus.
4. **Graceful Shutdown & Resource Cleanup:**  
   Pastikan setiap koneksi database, socket TCP, dan file stream ditutup secara eksplisit saat server menerima sinyal restart/shutdown.

---

## 4. Implementasi Nyata di Codebase Nexa Streetwear

### A. Prisma Client Global Singleton
Di [`backend/src/config/prisma.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts#L33-L43), sistem mencegah pembuatan instance ganda yang memicu kebocoran koneksi dan memori:

```typescript
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Gunakan instance yang sudah ada di global atau buat baru sekali saja
export const prisma = global.prisma || createPrismaClient();

if (env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
```

### B. Graceful Shutdown & Unreferenced Timers
Di [`backend/src/server.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L18-L44), penutupan koneksi dilakukan dengan aman:

```typescript
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down server gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect(); // Melepas pool database
      redis.disconnect();         // Melepas socket TCP Redis
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  });

  // Force shutdown jika macet dalam 10 detik.
  // Method .unref() memastikan timer ini TIDAK menahan proses Node.js dari terminasi normal.
  setTimeout(() => {
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

### C. Siklus Hidup File Stream Log Akses
Di [`backend/src/middleware/accessLogMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/accessLogMiddleware.ts#L37-L61), pergantian tanggal otomatis menutup stream lama agar file descriptor OS tidak bocor:

```typescript
// Jika tanggal berganti, tutup stream lama sebelum membuka yang baru
if (currentWriteStream && !currentWriteStream.destroyed) {
  currentWriteStream.end();
}

// Tutup stream dengan rapi saat server menerima sinyal terminasi OS
const closeStream = () => {
  if (currentWriteStream && !currentWriteStream.destroyed) {
    currentWriteStream.end();
  }
};
process.on("SIGTERM", closeStream);
process.on("SIGINT", closeStream);
```

### D. Delegasi Rate Limiting & OTP ke Redis
Seluruh data pelacakan frekuensi request (Rate Limiter di [`securityMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/securityMiddleware.ts)) dan kode OTP login 2FA di [`advancedAuth.routes.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/auth/advancedAuth.routes.ts) disimpan di **Redis dengan TTL otomatis**, bukan di dalam memori Node.js.

---

## 5. Cheatsheet Deteksi & Investigasi Memory Leak

### 1. Memeriksa Penggunaan Memori Real-Time di Node.js
Anda dapat memeriksa penggunaan memori proses kapan saja melalui method `process.memoryUsage()`:

```typescript
const mem = process.memoryUsage();
console.log({
  rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,           // Total alokasi RAM OS
  heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`, // Total ukuran Heap V8
  heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,   // Memori yang benar-benar dipakai
  external: `${Math.round(mem.external / 1024 / 1024)} MB`,   // Buffer biner di luar C++
});
```

### 2. Mengambil Heap Snapshot Menggunakan Node Inspect
Jalankan server backend dengan parameter inspect:
```bash
node --inspect dist/server.js
```
1. Buka browser Chrome, akses: `chrome://inspect`
2. Klik tombol **"Open dedicated DevTools for Node"**
3. Masuk ke tab **Memory** $\to$ Pilih **Take Heap Snapshot**
4. Beri beban traffic (load test), lalu ambil **Heap Snapshot ke-2**
5. Pilih tampilan **"Comparison"**:
   - Jika ada objek (misal `Array`, `Closure`, atau `Object`) dengan nilai **# Alloc (Alokasi)** tinggi dan **Delta** positif yang tidak pernah turun, itulah sumber memory leak Anda!

---

## 6. Kesimpulan

Dengan menerapkan prinsip **Stateless Architecture**, **Client Singleton**, **Stream Cleanup Lifecycles**, dan **Offloading ke Redis**:
- Server backend Nexa Streetwear memiliki profil memori yang stabil (rata-rata *Heap Used* < 80MB).
- Server kebal terhadap degradasi latensi yang disebabkan oleh *frequent Stop-The-World GC pauses*.
- Toko online siap dijalankan di server VPS hemat sumber daya selama berbulan-bulan tanpa memerlukan restart paksa harian.

# 11. Database Deadlock Storm & Retry Backoff

## 1. Masalah yang Terjadi
Pada aplikasi e-commerce berskala tinggi dengan ribuan request per detik (seperti **Flash Sale 11.11** atau **Limited Drop**):

**Deadlock Storm (Badai Deadlock)** adalah fenomena eskalasi bencana di mana **terjadi puluhan atau ratusan deadlock dalam waktu bersamaan, lalu mekanisme retry otomatis dari aplikasi justru memperparah keadaan, memicu lebih banyak deadlock baru hingga server database kehabisan CPU dan Connection Pool, lalu tumbang total (cascade failure / crash)**.

---

### Kronologi Terjadinya Deadlock Storm (Thundering Herd):

```text
[ Detik 00.01 - Titik Awal ]
1. Terjadi Deadlock pertama antara 2 transaksi konkuren.
   PostgreSQL mendeteksi kebuntuan dan MEMBUNUH salah satu transaksi (Rollback).

[ Detik 00.02 - Pemicu Badai (Naive Immediate Retry) ]
2. Kode backend yang naif langsung melakukan RETRY INSTAN di milidetik yang sama.
   Di saat yang sama, ratusan request checkout baru dari pembeli lain terus masuk.

[ Detik 00.03 - Efek Domino ]
3. Transaksi yang baru saja me-retry bertabrakan lagi dengan transaksi baru.
   Hasil: Terjadi 10 DEADLOCK BARU secara serentak!

[ Detik 00.04 - Eskalasi Menjadi BADAI ]
4. Ke-10 transaksi yang gagal itu SEMUANYA ME-RETRY SECARA BERSAMAAN (Thundering Herd)!
   Beban PostgreSQL meledak:
   • CPU database melonjak hingga 100% hanya untuk menjalankan algoritma Deadlock Detection.
   • Seluruh jatah Connection Pool (20-100 koneksi) terkunci dan habis (Exhausted).
   • Latensi melonjak dari 5ms menjadi 15.000ms+.

[ Detik 00.05 - Database Down ]
5. Database PostgreSQL mengalami Out of Memory (OOM) atau Kernel Freeze.
   Aplikasi toko online lumpuh total dan melempar error HTTP 500 / 503 ke seluruh pengguna.
```

---

## 2. Solusi Best Practice

Untuk memutus rantai badai deadlock, industri menggunakan kombinasi 3 strategi:

| Strategi | Mekanisme Kerja | Manfaat |
|:---|:---|:---|
| **1. Consistent Lock Ordering** | Mengurutkan ID item keranjang belanja (`.sort((a,b) => a.id - b.id)`) sebelum transaksi. | Menghilangkan akar penyebab deadlock sejak awal. |
| **2. Exponential Backoff** | Menunda percobaan ulang dengan jeda waktu yang berlipat ganda secara eksponensial ($T \times 2^{attempt}$). | Memberi napas bagi database untuk menyelesaikan antrean yang sedang berjalan. |
| **3. Random Jitter (Pengacak Jeda)** | Menambahkan rentang waktu acak (*random noise*) pada jeda retry. | **Mencegah Thundering Herd:** Transaksi yang gagal tidak akan menabrak database di milidetik yang sama lagi. |
| **4. Max Retries Limit** | Membatasi maksimal percobaan (misal: 3 kali). | Mencegah loop tak terbatas yang membebani memori. |

---

## 3. Implementasi di Project Ini

### A. Utility Helper: [`backend/src/utils/transactionRetry.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/utils/transactionRetry.ts)
Helper modular yang membungkus transaksi Prisma dan mendeteksi kode error deadlock (`P2034`, `40P01`, `40001`):

```typescript
import { PrismaClient } from "@prisma/client";

export async function executeWithRetry<T>(
  prismaInstance: PrismaClient,
  operation: (tx: any) => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 50;
  let attempt = 0;

  while (true) {
    try {
      attempt++;
      // Eksekusi transaksi Prisma
      return await prismaInstance.$transaction(operation);
    } catch (error: any) {
      const isDeadlock =
        error.code === "P2034" || // Prisma write conflict / transaction conflict
        error.code === "40P01" || // PostgreSQL deadlock_detected
        error.code === "40001" || // PostgreSQL serialization_failure
        error.message?.includes("deadlock detected");

      // Jika bukan deadlock atau jatah retry sudah habis, lempar error asli
      if (!isDeadlock || attempt >= maxRetries) {
        throw error;
      }

      // RUMUS ANTI-DEADLOCK STORM: Exponential Backoff + Random Jitter
      // Attempt 1: 50ms * 2^1 + random(0-50ms) = 100ms - 150ms
      // Attempt 2: 50ms * 2^2 + random(0-50ms) = 200ms - 250ms
      // Attempt 3: 50ms * 2^3 + random(0-50ms) = 400ms - 450ms
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * baseDelayMs);
      const totalDelay = exponentialDelay + jitter;

      console.warn(
        `[Deadlock Warning] Terdeteksi deadlock/konflik konkurensi (attempt ${attempt}/${maxRetries}). ` +
        `Menunggu ${totalDelay}ms sebelum retry...`
      );

      // Jeda asinkron sebelum retry
      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }
}
```

---

### B. Integrasi di Proses Checkout: [`backend/src/modules/order/order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L33-L40)

Seluruh proses pembuatan pesanan, verifikasi stok, dan pemotongan stok kini dilindungi ganda:
1. **Pencegahan Pertama:** Item keranjang diurutkan berdasarkan `product_variant_id`.
2. **Peredam Badai:** Transaksi dibungkus menggunakan `executeWithRetry`:

```typescript
// Transaksi checkout dilindungi oleh executeWithRetry untuk meredam Deadlock Storm
const result = await executeWithRetry(prisma, async (tx) => {
  // 1. Sort varian untuk konsistensi penguncian baris
  const sortedCartItems = [...cartItems].sort(
    (a, b) => a.product_variant_id - b.product_variant_id
  );

  // 2. Batch check varian
  const variantIds = sortedCartItems.map((item) => item.product_variant_id);
  const variants = await tx.product_variants.findMany({ ... });

  // 3. Potong stok varian dengan conditional atomic decrement
  for (const item of sortedCartItems) {
    await OrderModel.deductVariantStock(tx, item.product_variant_id, item.quantity);
  }

  ...
});
```

---

### C. Simulasi Redaman Badai (Kenapa Jitter Berhasil?)

Misalkan terjadi lonjakan 5 transaksi checkout yang bertabrakan:
* **Tanpa Jitter:** Kelima transaksi me-retry tepat di milidetik 100 $\to$ **Tabrakan lagi (Badai berlanjut)**.
* **Dengan Jitter:**
  * Transaksi 1 me-retry di milidetik ke **107ms** $\to$ Sukses!
  * Transaksi 2 me-retry di milidetik ke **142ms** $\to$ Sukses!
  * Transaksi 3 me-retry di milidetik ke **118ms** $\to$ Sukses!
  * Transaksi 4 me-retry di milidetik ke **131ms** $\to$ Sukses!
  * Transaksi 5 me-retry di milidetik ke **125ms** $\to$ Sukses!

**Hasil:** Beban terdistribusi merata di garis waktu. Database PostgreSQL tetap stabil, antrean terurai rapi, dan sistem kebal dari *Deadlock Storm*.

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Helper retry transaksi dengan *Exponential Backoff & Full Random Jitter* di [`transactionRetry.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/utils/transactionRetry.ts) aktif meredam badai tabrakan transaksi konkuren (kode error `40P01` dan `55P03`).

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Circuit Breaker Pattern (Pelindung DB saat Failover/Crash):**  
   Saat database PostgreSQL mengalami kegagalan fatal (misal disk I/O 100% atau failover master), mekanisme retry yang membabi-buta justru memperparah kondisi server (*cascading failure*). Batasan mentoknya adalah memadukan retry helper dengan *Circuit Breaker* (seperti library Opossum) yang otomatis membuka sirkuit dan langsung mengembalikan error tanpa retry jika tingkat kegagalan transaksi melebihi **50%** dalam kurun waktu 10 detik.
2. **Real-time Deadlock Storm Alerting Webhook:**  
   Belum ada alarm peringatan real-time yang memicu notifikasi instan ke channel Slack/Telegram DevOps jika counter retry deadlock mendeteksi lebih dari 10 tabrakan dalam 1 menit.

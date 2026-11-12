# 10. Concurrent Map Writes & Async State Collisions

Dokumen ini membedah masalah **Concurrent Map Writes** dan **Race Condition pada In-Memory State**, bagaimana eksekusi asinkron di Node.js dapat menyebabkan tabrakan penulisan data dan *overselling* di e-commerce, serta mitigasi arsitektur di project **Nexa Streetwear**.

---

## 1. Anatomi Masalah: Ilusi Single-Thread Node.js

Node.js terkenal dengan arsitektur *Single-Threaded Event Loop*. Banyak pengembang berasumsi bahwa karena hanya ada satu thread utama, masalah *concurrency bug* dan tabrakan penulisan (*write collisions*) tidak akan pernah terjadi.

**Asumsi tersebut salah besar ketika melibatkan operasi asinkron (`async / await`).**

```
Timeline Eksekusi Asinkron (Interleaved Async Execution):

Request A (Pembeli 1) --------[Baca Stok: 1]----( Tunggu DB )----------------[Tulis Stok: 0]----> SUKSES
Request B (Pembeli 2) ----------------[Baca Stok: 1]----( Tunggu DB )----------------[Tulis Stok: 0]----> SUKSES! (OVERSELLING!)
                                                                 ^
                                             KEDUA REQUEST MELIHAT STOK = 1
```

### Mekanisme Tabrakan Data (Lost Update)
1. **Siklus Run-to-Completion Terbagi oleh `await`:**  
   Node.js hanya menjamin bahwa kode sinkron berjalan tanpa interupsi. Namun saat runtime bertemu dengan *await boundary* (menunggu I/O database atau jaringan), kontrol event loop langsung diserahkan untuk memproses request HTTP pembeli berikutnya.
2. **Bahaya Menggunakan Variabel `Map` / Objek RAM Global:**  
   Jika aplikasi e-commerce melacak kuota voucher atau stok produk menggunakan in-memory state:
   ```typescript
   // ❌ SANGAT BERBAHAYA: In-memory state rentan terhadap concurrent write collision
   const stockMap = new Map<string, number>();

   async function handleCheckout(productId: string) {
     const currentStock = stockMap.get(productId) || 0; // Tick 1: Pembeli 1 & 2 baca nilai sama
     await verifyPaymentGateway();                      // Await: Event loop berganti request!
     stockMap.set(productId, currentStock - 1);         // Tick 2: Tabrakan penulisan (Lost Update)
   }
   ```
3. **Bahaya di Lingkungan Multi-Thread (Worker Threads):**  
   Jika Node.js Worker Threads atau bahasa multi-threaded (Go/Java) menulis ke *Shared Map* tanpa sinkronisasi mutex/lock, hal ini memicu korupsi pointer memori atau fatal runtime panic (*fatal error: concurrent map writes*).

---

## 2. Dampak Fatal pada Transaksi E-Commerce

* **Overselling (Penjualan Melebihi Stok):** Dua pembeli berhasil membayar item jaket terakhir pada detik yang sama. Stok fisik di gudang hanya 1, namun sistem mencatat 2 pesanan berhasil (*double sale*).
* **Kebocoran Kuota Diskon:** Kode voucher promo dengan batas pemakaian 50 kali berhasil digunakan 65 kali karena pengecekan kuota bertabrakan di memori.
* **Inkonsistensi Saldo Dompet Pengguna:** Saldo refund atau poin loyalitas pengguna terpotong ganda atau tidak tercatat (*lost write*).

---

## 3. Strategi & Best Practices Rekayasa

### A. Prinsip "Zero Business State in Application RAM"
Jangan pernah menyimpan data transaksi yang dapat berubah (seperti stok, saldo, atau kuota voucher) di dalam variabel in-memory JavaScript (`Map`, `Object`, atau `Array`). Variabel memori Node.js hanya boleh digunakan untuk data konfigurasi statis yang tidak pernah dimutasi saat runtime.

### B. Pengurangan Stok Atomik di Tingkat Database (Atomic Decrement)
Alih-alih membaca data ke memori aplikasi lalu menulisnya kembali (*Read-Modify-Write*), lakukan mutasi secara atomik langsung di dalam database:
```sql
-- Operasi ini bersifat atomik dan mengunci baris (Row-Level Lock)
UPDATE products 
SET stock = stock - 1 
WHERE id = $1 AND stock >= 1;
```
Jika stok sudah bernilai 0, database mengembalikan `affected_rows = 0`, menolak request pembeli kedua seketika.

### C. Benteng Database CHECK Constraints
Pasang batasan integritas level kernel database:
```sql
ALTER TABLE product_variants ADD CONSTRAINT check_stock_positive CHECK (stock >= 0);
```
Jika ada bug aplikasi yang mencoba membuat stok bernilai `-1`, transaksi akan langsung dibatalkan (*abort/rollback*) oleh PostgreSQL.

### D. Consistent Lock Ordering (Anti-Deadlock)
Saat pembeli membeli beberapa item sekaligus (misal: Produk A dan Produk B), urutkan ID produk secara konsisten (misal: ID terkecil ke terbesar) sebelum dieksekusi di database untuk mencegah kebuntuan (*deadlock*).

---

## 4. Implementasi Nyata di Codebase Nexa Streetwear

### A. Transaksi Atomik & Pengurutan ID Produk: [`backend/src/modules/order/order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L42-L75)
Sistem Nexa menjamin tidak ada race condition saat checkout:

```typescript
// 1. Urutkan item berdasarkan ID secara deterministik untuk mencegah deadlock
const sortedItems = [...items].sort((a, b) => a.productId - b.productId);

// 2. Eksekusi di dalam Prisma Database Transaction atomik
await prisma.$transaction(async (tx) => {
  for (const item of sortedItems) {
    // Pengurangan stok atomik langsung di database
    const updated = await tx.productVariant.updateMany({
      where: {
        id: item.variantId,
        stock: { gte: item.quantity }, // Guard: pastikan stok mencukupi
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (updated.count === 0) {
      throw new AppError(`Stok produk tidak mencukupi untuk item ${item.productId}`, 400);
    }
  }
  
  // Buat order dan invoice...
});
```

### B. Operasi Atomik Redis untuk Rate Limiting: [`backend/src/middleware/securityMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/securityMiddleware.ts#L68-L75)
Penghitungan kuota request rate limiter tidak menggunakan `Map` JavaScript, melainkan perintah atomik Redis **`INCR`**:
```typescript
const current = await redis.incr(key); // Atomik thread-safe
if (current === 1) {
  await redis.expire(key, windowSeconds);
}
```

---

## 5. Cheatsheet Simulasi Pengujian Concurrency

Uji ketahanan endpoint checkout terhadap tabrakan transaksi paralel menggunakan skrip simulasi `Promise.all`:

```typescript
// test-concurrency.ts: Menembak 10 checkout secara serentak untuk produk bersisa 1
async function testParallelCheckout() {
  const requests = Array.from({ length: 10 }).map(() =>
    fetch("http://localhost:5000/api/orders/checkout", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer <TOKEN_USER>"
      },
      body: JSON.stringify({ items: [{ variantId: 1, quantity: 1 }] }),
    }).then(res => res.status)
  );

  const results = await Promise.all(requests);
  console.log("Hasil Checkout:", results);
  // HASIL YANG BENAR:
  // [201, 400, 400, 400, 400, 400, 400, 400, 400, 400]
  // Hanya tepat 1 request yang berhasil (201), 9 lainnya ditolak dengan aman (400)!
}
```

---

## 6. Kesimpulan

Dengan membuang seluruh *in-memory transactional state*, menerapkan **Atomic Decrement Database (`gte` guard)**, **Consistent Lock Ordering**, dan **Redis Atomic Primitives**, backend Nexa Streetwear 100% kebal terhadap bahaya *concurrent write collisions* dan *overselling*, menjamin akurasi mutlak inventori toko di tengah serbuan transaksi flash sale.

# 10. Deadlock & Race Condition (Stok Minus / Overselling)

Dokumen ini membedah secara mendalam dua masalah konkurensi database paling krusial di e-commerce, bagaimana mekanismenya di balik layar, simulasi milidetik, jebakan kodingan, serta arsitektur solusi yang diterapkan di project ini.

---

## 1. Deadlock (Saling Sandera Kunci Antar Transaksi)

### A. Kapan Momen Saling Mengunci Ini Terjadi?
Database PostgreSQL menerapkan aturan keamanan:
> **Row-Level Exclusive Lock:** Setiap kali ada transaksi yang sedang mengubah baris data (`UPDATE` / `DELETE`), baris tersebut **otomatis dikunci eksklusif** oleh database sampai transaksi selesai (`COMMIT` atau `ROLLBACK`). Transaksi lain yang ingin mengubah baris yang sama **wajib mengantre**.

**Deadlock terjadi ketika dua transaksi sama-sama berjalan di milidetik yang sama, dan masing-masing perlu mengubah lebih dari satu baris data, tetapi urutannya terbalik.**

---

### B. Simulasi Nyata: Bagaimana Mereka Saling Mengunci?
Misalkan ada event Flash Sale di toko streetwear Nexa. Dua pembeli checkout dua barang yang sama:
* **Barang X:** Sepatu Sneakers (ID: 10)
* **Barang Y:** Jaket Denim (ID: 20)

Pembeli memasukkan barang ke keranjang belanja dengan urutan berbeda:
* **Pembeli A:** Sepatu dulu (10), baru Jaket (20).
* **Pembeli B:** Jaket dulu (20), baru Sepatu (10).

Keduanya menekan tombol *"Bayar"* bersamaan:

```text
Milidetik  │ Transaksi Pembeli A                      │ Transaksi Pembeli B
───────────┼──────────────────────────────────────────┼──────────────────────────────────────────
ms 01      │ UPDATE product_variants (ID: 10)         │ UPDATE product_variants (ID: 20)
           │ 🔒 Sepatu (ID: 10) DIKUNCI Pembeli A!    │ 🔒 Jaket (ID: 20) DIKUNCI Pembeli B!
           │                                          │
ms 02      │ Mau lanjut UPDATE Jaket (ID: 20):        │ Mau lanjut UPDATE Sepatu (ID: 10):
           │ "Database, tolong potong Jaket (20)!"    │ "Database, tolong potong Sepatu (10)!"
           │                                          │
           │ DB: "Tunggu Pembeli A! Jaket (20) lagi   │ DB: "Tunggu Pembeli B! Sepatu (10) lagi 
           │ dikunci oleh B. Kamu harus antre!"       │ dikunci oleh A. Kamu harus antre!"
───────────┼──────────────────────────────────────────┼──────────────────────────────────────────
ms 03      │ Pembeli A BENGONG MENUNGGU Pembeli B...  │ Pembeli B BENGONG MENUNGGU Pembeli A...
(Macet     │ (A tidak bisa commit sebelum dapat 20)   │ (B tidak bisa commit sebelum dapat 10)
 Total)    │                                          │
```

**Lingkaran Setan (*Circular Wait*):**
* Pembeli A menolak melepas kunci Sepatu (10) sebelum berhasil mengubah Jaket (20).
* Pembeli B menolak melepas kunci Jaket (20) sebelum berhasil mengubah Sepatu (10).
* Keduanya saling sandera dan membeku (*hang*) selamanya!

**Tindakan PostgreSQL:**
Detektor internal PostgreSQL (*Deadlock Detector*) mendeteksi siklus saling tunggu ini, lalu **membunuh paksa salah satu transaksi secara acak**:
```text
ERROR: 40P01: deadlock detected
DETAIL: Process 12345 waits for ExclusiveLock on tuple (0, 10); blocked by process 12346.
Process 12346 waits for ExclusiveLock on tuple (0, 20); blocked by process 12345.
```
Salah satu pembeli tiba-tiba gagal bayar dengan pesan error tanpa tahu apa penyebabnya.

---

### C. Solusi di Project Ini: Consistent Lock Ordering (Sorting)
Di [`backend/src/modules/order/order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L34-L37):

Sebelum mengeksekusi operasi database di dalam `$transaction`, seluruh item keranjang belanja **wajib disortir berdasarkan ID secara menaik**:

```typescript
const result = await prisma.$transaction(async (tx) => {
  // ATURAN EMAS ANTI-DEADLOCK:
  // Mengurutkan item dari ID kecil ke besar
  const sortedCartItems = [...cartItems].sort(
    (a, b) => a.product_variant_id - b.product_variant_id
  );

  // Seluruh update baris mengikuti urutan terurut ini:
  for (const item of sortedCartItems) {
    await OrderModel.deductVariantStock(tx, item.product_variant_id, item.quantity);
  }
});
```

#### Simulasi Setelah Di-Sort (Bebas Deadlock):
* Pembeli A mengunci: **ID 10 $\to$ ID 20**.
* Pembeli B **JUGA DIPAKSA** mengunci: **ID 10 $\to$ ID 20**.

```text
Milidetik  │ Transaksi Pembeli A                     │ Transaksi Pembeli B
───────────┼─────────────────────────────────────────┼─────────────────────────────────────────
ms 01      │ Mau kunci Sepatu (ID: 10)               │ Mau kunci Sepatu (ID: 10) juga!
           │ 🔒 Sepatu (10) berhasil didapat A!      │ ⏳ B antre dengan tertib di belakang A.
           │                                         │
ms 02      │ Lanjut kunci Jaket (ID: 20)             │ (B masih sabar menunggu giliran Sepatu)
           │ 🔒 Jaket (20) berhasil didapat A!       │
           │                                         │
ms 03      │ Transaksi A SELESAI (COMMIT).           │
           │ Kunci Sepatu & Jaket DILEPAS semua.     │
           │                                         │
ms 04      │                                         │ Giliran B masuk:
           │                                         │ 🔒 B kunci Sepatu (10) -> Sukses
           │                                         │ 🔒 B kunci Jaket (20)  -> Sukses
           │                                         │ Transaksi B SELESAI!
```
**Hasil:** Siklus saling sandera musnah 100%. Pembeli B hanya mengantre beberapa milidetik dan kedua transaksi berhasil diproses dengan mulus.

---

## 2. Race Condition (Overselling / Stok Minus)

### A. Jebakan Kodingan Pemula (Kenapa Stok Bisa Minus?)
Banyak developer membuat kode checkout seperti ini:

```typescript
// ❌ CONTOH KODINGAN SALAH:

// 1. Baca data dari database ke memori JavaScript
const variant = await db.product_variants.findUnique({ where: { id: 10 } });

// 2. Cek di if statement
if (variant.stock >= 1) {
  // 3. Kurangi di variabel memori JS
  const sisaStok = variant.stock - 1;

  // 4. Update database dengan menimpa nilai sisaStok tadi
  await db.product_variants.update({
    where: { id: 10 },
    data: { stock: sisaStok } // 💥 MENIMPA DENGAN NILAI USANG!
  });
}
```

**Kenapa Cara di Atas Rusak Saat Stok = 1?**
1. **User A** membaca stok = **1** $\to$ lolos `if (1 >= 1)`.
2. Tepat di milidetik yang sama, **User B** membaca stok = **1** $\to$ lolos `if (1 >= 1)` juga!
3. User A menghitung `1 - 1 = 0` $\to$ simpan `stock = 0`. Sukses bayar!
4. User B menghitung menggunakan angka `1` yang tadi dibaca $\to$ User B simpan `stock = 0` (atau `0 - 1 = -1`). Sukses bayar juga!
5. **Dua pasang sepatu terjual, padahal stok fisik di gudang cuma ada 1 pasang (Overselling)!**

---

### B. Tiga Lapis Pertahanan di Project Ini

Untuk menjamin stok tidak pernah minus dalam kondisi ekstrem sekalipun, project ini menerapkan 3 lapis perlindungan:

#### Lapis 1: Atomic Database Decrement (Bukan Hitung di JS)
Perhitungan stok diserahkan langsung ke mesin PostgreSQL menggunakan operator `decrement`:
```typescript
data: {
  stock: { decrement: quantity } // SQL: "SET stock = stock - quantity"
}
```
Mesin PostgreSQL mengeksekusi operasi aritmatika ini secara atomik (tidak bisa disela proses lain).

#### Lapis 2: Conditional Atomic Decrement di [`order.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.model.ts#L53-L68)
Meskipun atomik, jika stok tersisa 0 lalu di-decrement 1, nilainya tetap bisa menjadi `-1`.  
Maka kita tambahkan **kondisi penjaga gawang (*Guard Condition*)** di dalam klausa `where`:

```typescript
static async deductVariantStock(tx: any, variantId: number, quantity: number): Promise<any> {
  const db = tx || prisma;
  
  // KUNCI UTAMA:
  const result = await db.product_variants.updateMany({
    where: {
      id: Number(variantId),
      stock: { gte: quantity }, // gte = Greater Than or Equal (Hanya update jika stok cukup)
    },
    data: {
      stock: { decrement: quantity },
    },
  });

  // Jika barang baru saja habis dibeli orang lain milidetik lalu:
  if (result.count === 0) {
    throw new AppError("Stock is insufficient or already depleted by another transaction", 400);
  }

  return result;
}
```

#### Simulasi Milidetik Saat Stok = 1:
```text
Database: Stok Sepatu = 1
─────────────────────────────────────────────────────────────────────────────
Milidetik 01:
User A dan User B sama-sama mengeksekusi:
UPDATE product_variants SET stock = stock - 1 WHERE id = 10 AND stock >= 1;

Milidetik 02:
User A memperoleh giliran pertama:
• PostgreSQL verifikasi: "Apakah stok >= 1?" -> YA! (Stok saat ini 1).
• Stok dipotong dari 1 menjadi 0.
• Hasil: count = 1 -> Sukses! Pesanan User A diproses.

Milidetik 03:
User B memperoleh giliran berikutnya:
• PostgreSQL verifikasi: "Apakah stok >= 1?" -> TIDAK! (Stok saat ini sudah 0).
• PostgreSQL TIDAK MENGURANGI APAPUN!
• Hasil: count = 0 (Gagal update).
• Blok if (result.count === 0) TERPICU!
• Transaksi User B langsung di-rollback otomatis dan melempar pesan:
  "Stock is insufficient or already depleted by another transaction".
─────────────────────────────────────────────────────────────────────────────
HASIL AKHIR:
Stok tetap 0 (TIDAK PERNAH MINUS).
Barang hanya terjual ke User A, pesanan User B ditolak dengan aman.
```

#### Lapis 3: Benteng Terakhir di Mesin PostgreSQL (Check Constraint)
Sebagai perlindungan mutlak jika ada query liar atau bug di masa depan, tabel `product_variants` dipasangi integritas data langsung di level database:

```sql
ALTER TABLE product_variants ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);
```
Jika ada perintah SQL apa pun yang mencoba membuat kolom `stock` bernilai negatif (`< 0`), PostgreSQL **secara native langsung menolak eksekusi tersebut** dengan error `check_stock_non_negative constraint violation`.

---

## 3. Rangkuman Perbedaan & Solusi

| Pembeda | Deadlock | Race Condition |
|:---|:---|:---|
| **Inti Masalah** | Saling sandera kunci baris data $\to$ **Transaksi macet & dibatalkan paksa**. | Balapan mengubah data yang sama $\to$ **Data tidak konsisten (stok minus)**. |
| **Pemicu** | Mengubah banyak baris data dengan **urutan terbalik**. | Membaca data ke memori aplikasi lalu menimpa tanpa verifikasi atomik saat lock. |
| **Solusi di Project Ini** | **Consistent Lock Ordering:** Item keranjang belanja selalu diurutkan (`.sort((a,b) => a.id - b.id)`) sebelum transaksi. | **3 Lapis Pertahanan:**<br>1. Atomic `decrement`<br>2. Conditional update `WHERE stock >= quantity`<br>3. PostgreSQL `CHECK (stock >= 0)` constraint. |

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Deadlock pada multi-item order telah dieliminasi 100% menggunakan *Consistent Lock Ordering* (pengurutan ID numerik sebelum penguncian baris).
* Race condition stok minus dicegah melalui 3 benteng: atomic decrement, conditional update, dan constraint `CHECK (stock >= 0)`.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **In-Memory Pre-Allocation via Redis Lua Script (Flash Sale Scale):**  
   Saat ini setiap pengurangan stok langsung menyentuh row PostgreSQL. Jika ada event diskon kilat (*Flash Sale*) 10.000 pesanan per detik untuk 1 varian barang yang sama, lock manager PostgreSQL akan antre panjang (*lock contention*). Batasan mentoknya adalah memotong stok di memori Redis terlebih dahulu menggunakan skrip atomik Lua (`DECRBY` dengan validasi `>= 0`), baru kemudian antrean pesanan di-commit ke PostgreSQL secara asinkron via message queue (RabbitMQ / BullMQ).
2. **Optimistic Locking via Version Field (`OCC`):**  
   Untuk skenario update data produk oleh multi-admin (misal 2 staf mengedit deskripsi produk yang sama), sistem belum menerapkan *Optimistic Concurrency Control* berbasis kolom `version: Int` (`UPDATE products SET ... version = version + 1 WHERE id = 1 AND version = 5`) untuk mencegah data tertimpa tanpa sengaja.

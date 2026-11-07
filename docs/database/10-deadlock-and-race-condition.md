# 10. Deadlock & Race Condition (Stok Minus / Overselling)

## 1. Masalah yang Terjadi
Pada aplikasi e-commerce berskala tinggi, terutama saat **Flash Sale** atau **Rilis Sepatu Terbatas (Limited Drop)**, dua masalah konkurensi database ini sering terjadi:

### A. Race Condition (Overselling / Stok Minus)
Terjadi ketika dua atau lebih pembeli menekan tombol *"Checkout / Bayar"* di milidetik yang sama pada barang yang stoknya tersisa 1:
```text
[ Database: Stok Sepatu = 1 ]
   │
   ├─► User A: Cek stok -> "Ada 1" (Lolos)
   ├─► User B: Cek stok -> "Ada 1" (Lolos)
   │
   ├─► User A: Potong stok (1 - 1 = 0) -> Sukses bayar
   └─► User B: Potong stok (0 - 1 = -1) -> Sukses bayar juga (BENCANA STOK MINUS!)
```
**Dampaknya:** Toko menjual barang yang fisiknya tidak ada di gudang, merugikan reputasi bisnis dan memaksa pembatalan pesanan sepihak.

### B. Deadlock (Saling Sandera Antar Transaksi)
Terjadi ketika dua transaksi concurrent mengunci baris data yang sama tetapi dengan urutan terbalik:
* **User A:** Checkout Sepatu (ID: 10) lalu Jaket (ID: 20).
* **User B:** Checkout Jaket (ID: 20) lalu Sepatu (ID: 10).

```text
Waktu   | Transaksi User A            | Transaksi User B
────────┼─────────────────────────────┼─────────────────────────────
Detik 1 │ Lock Sepatu ID: 10 (Sukses) │ Lock Jaket ID: 20 (Sukses)
Detik 2 │ Mau lock Jaket ID: 20...    │ Mau lock Sepatu ID: 10...
        │ (Menunggu User B selesai)   │ (Menunggu User A selesai)
────────┴─────────────────────────────┴─────────────────────────────
HASIL: KEDUA TRANSAKSI SALING KUNCI (DEADLOCK)!
```
PostgreSQL akan mendeteksi kebuntuan ini dan membatalkan paksa salah satu transaksi dengan error:  
`ERROR: 40P01: deadlock detected`.

---

## 2. Solusi Best Practice

| Masalah | Solusi Best Practice | Mekanisme Kerja |
|:---|:---|:---|
| **Deadlock** | **Consistent Lock Ordering** | Seluruh transaksi wajib mengurutkan data (*sort by ID*) sebelum melakukan penguncian/update baris. |
| **Race Condition** | **Conditional Atomic Decrement** | Potong stok langsung di SQL dengan kondisi `WHERE stock >= quantity`. |
| **Race Condition** | **Database Check Constraint** | Pasang `CHECK (stock >= 0)` di level database engine sebagai benteng terakhir. |

---

## 3. Implementasi di Project Ini

### A. Pencegahan Deadlock via Sorting di [`order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L34-L37)
Sebelum transaksi checkout mengeksekusi operasi database, seluruh item di keranjang belanja diurutkan berdasarkan `product_variant_id` secara menaik:

```typescript
const result = await prisma.$transaction(async (tx) => {
  // ATURAN ANTI-DEADLOCK:
  // Selalu urutkan item berdasarkan ID agar urutan penguncian baris konsisten
  const sortedCartItems = [...cartItems].sort(
    (a, b) => a.product_variant_id - b.product_variant_id
  );

  // Seluruh proses validasi dan pemotongan stok mengikuti urutan terurut ini
  ...
```
* **Hasil:** Semua transaksi concurrent (User A, User B, User C) akan mengunci baris varian dengan urutan identik (ID kecil ke besar). Siklus saling sandera (*circular wait*) musnah 100%.

---

### B. Pencegahan Race Condition via Conditional Atomic Decrement di [`order.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.model.ts#L53-L68)
Pemotongan stok tidak mengandalkan nilai yang dibaca sebelumnya di memori, melainkan langsung diverifikasi secara atomik saat *row lock* diperoleh:

```typescript
static async deductVariantStock(tx: any, variantId: number, quantity: number): Promise<any> {
  const db = tx || prisma;
  const result = await db.product_variants.updateMany({
    where: {
      id: Number(variantId),
      stock: { gte: quantity }, // PROTEKSI: Pastikan stok >= quantity saat row lock aktif
    },
    data: {
      stock: { decrement: quantity }, // Dieksekusi atomik: "stock = stock - quantity"
    },
  });

  // Jika stok mendadak habis dibeli user lain di milidetik yang sama:
  if (result.count === 0) {
    throw new AppError("Stock is insufficient or already depleted by another transaction", 400);
  }

  return result;
}
```
* **Hasil:** Jika 2 user berebut 1 stok terakhir:
  * User 1 memperoleh lock $\to$ `stock >= 1` valid $\to$ stok dipotong menjadi 0 (`count = 1`).
  * User 2 menunggu antrean lock $\to$ saat giliran tiba, `stock >= 1` sudah salah $\to$ `count = 0` $\to$ Transaksi User 2 otomatis di-rollback tanpa menyisakan stok minus.

---

### C. Benteng Terakhir: Check Constraint PostgreSQL
Di level mesin PostgreSQL, tabel `product_variants` dipasangi integritas data:

```sql
ALTER TABLE product_variants ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);
```
Jika ada bug kodingan atau query liar yang mencoba membuat stok di bawah 0, PostgreSQL langsung menolak eksekusi tersebut di level basis data.

# 07. Database Index Fragmentation (Index Bloat)

## 1. Masalah yang Terjadi
Pada database relasional dengan struktur **B-Tree** seperti PostgreSQL:
* Setiap baris indeks disimpan di dalam blok berukuran 8 KB yang disebut **Leaf Page**.
* Ketika baris data dihapus (`DELETE`) atau diperbarui (`UPDATE` di PostgreSQL menghasilkan baris baru + *dead tuple*), pointer di halaman indeks dicoret dan menyisakan **lubang kosong**.
* B-Tree tidak serta merta memadatkan halaman tersebut demi menjaga urutan data dan menghemat biaya CPU.
* **Akibatnya:** Halaman indeks menjadi **bolong-bolong / kopong (*Index Fragmentation / Bloat*)**. Satu halaman 8 KB yang seharusnya muat 100 pointer kini cuma terisi 10 pointer aktif.
* Ukuran file indeks membengkak di disk, RAM (Buffer Cache) terbuang untuk memuat halaman kosong, dan performa pencarian kembali lambat.

Tabel yang paling cepat mengalami fragmentasi di toko online:
1. `refresh_tokens`: Token login terus menerus dibuat, di-refresh, dan dihapus saat logout / kadaluwarsa.
2. `cart_items`: Keranjang terus ditambah, diubah quantity, dan dibersihkan saat checkout.
3. `orders`: Status pesanan terus di-update (`pending` $\to$ `paid` $\to$ `shipped`).

---

## 2. Solusi Best Practice
Menjalankan perintah **`REINDEX`** secara berkala (misal: seminggu sekali saat jam toko sepi pembeli):
* Database membaca seluruh baris data aktif di tabel asli.
* Database menyusun pohon B-Tree yang **benar-benar baru dan padat 100% dari nol**.
* Indeks lama yang bolong-bolong dibuang ke tempat sampah dan ruang disk dibebaskan.

### ⚠️ Aturan Kritis: Gunakan `CONCURRENTLY`
Jika hanya menjalankan `REINDEX TABLE orders;`, PostgreSQL akan **mengunci tabel secara eksklusif** (user tidak bisa belanja/checkout).  
**Wajib gunakan `REINDEX TABLE CONCURRENTLY;`** agar proses rebuild berjalan di latar belakang tanpa downtime (*zero downtime*).

---

## 3. Implementasi di Project Ini

### A. Skrip Otomasi Maintenance: [`backend/scripts/reindex.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/reindex.ts)
Skrip mandiri TypeScript yang mengeksekusi defragmentasi indeks non-blocking untuk seluruh 15 tabel aktif:

```typescript
import { prisma } from "../src/config/prisma.js";

const TARGET_TABLES = [
  "refresh_tokens",
  "cart_items",
  "carts",
  "orders",
  "order_items",
  "payments",
  "shippings",
  "product_variants",
  "products",
  "product_reviews",
  "wishlists",
  "addresses",
  "audit_logs",
  "users",
  "categories",
];

async function runIndexMaintenance() {
  for (const table of TARGET_TABLES) {
    try {
      // Rebuild indeks secara online tanpa me-lock tabel
      await prisma.$executeRawUnsafe(`REINDEX TABLE CONCURRENTLY "${table}";`);
      console.log(`✅ Sukses: Tabel "${table}" selesai di-reindex`);
    } catch (error) {
      console.error(`❌ Gagal reindex tabel "${table}":`, error);
    }
  }
  await prisma.$disconnect();
}

runIndexMaintenance();
```

### B. Shortcut CLI di [`package.json`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/package.json#L15)
Dapat dijalankan kapan saja atau dijadwalkan via server Cron Job:
```bash
npm run db:reindex
```

Output eksekusi:
```text
=================================================
🚀 [START] Database Index Defragmentation / Reindex
=================================================
⏳ [PROSES] Merapikan indeks tabel: "refresh_tokens"...
✅ [SUKSES] Tabel "refresh_tokens" selesai di-reindex (0.11 detik)
⏳ [PROSES] Merapikan indeks tabel: "cart_items"...
✅ [SUKSES] Tabel "cart_items" selesai di-reindex (0.01 detik)
...
=================================================
📊 [RINGKASAN REINDEX]
- Berhasil : 15 tabel
- Gagal    : 0 tabel
✨ Semua pohon indeks aktif kembali padat, rapi, dan cepat!
=================================================
```

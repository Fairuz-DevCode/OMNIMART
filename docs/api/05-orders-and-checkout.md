# 05. Orders & Checkout API

Modul ini mengelola transaksi inti e-commerce: proses checkout aman terlindungi **Idempotency Key (RFC 7240)**, pengurangan stok atomik ACID, riwayat pemesanan, pembatalan pesanan, serta manajemen status order oleh Admin.

---

## 1. Checkout / Buat Pesanan Baru (Idempotent Transaction)
Membuat pesanan baru dari item keranjang belanja atau item instan. Mengurangi stok varian secara atomik dan membersihkan keranjang user.

* **Method:** `POST`
* **URL:** `/api/orders`
* **Headers:**  
  - `Authorization: Bearer <accessToken>`
  - `Idempotency-Key: <UUID>` *(Wajib untuk mencegah order ganda saat jaringan tidak stabil)*

### Request Body:
```json
{
  "address_id": 101,
  "shipping_service": "JNE REG",
  "shipping_cost": 22000,
  "notes": "Tolong bungkus rapi dengan bubble wrap hitam."
}
```

### Response Success (`201 Created`):
```json
{
  "status": "success",
  "message": "Order created successfully",
  "payload": {
    "order_id": 1042,
    "invoice_number": "INV-NEXA-20261112-1042",
    "total_amount": 521000,
    "subtotal": 499000,
    "shipping_cost": 22000,
    "status": "PENDING_PAYMENT",
    "items": [
      {
        "product_name": "Nexa Cyberpunk Oversized Hoodie",
        "size": "M",
        "color": "Black",
        "quantity": 1,
        "price": 499000
      }
    ],
    "created_at": "2026-11-12T05:00:00.000Z"
  }
}
```

---

## 2. Riwayat Pesanan Pengguna
Mengambil seluruh daftar transaksi yang pernah dibuat oleh pelanggan yang sedang login.

* **Method:** `GET`
* **URL:** `/api/orders`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Orders history retrieved successfully",
  "payload": [
    {
      "id": 1042,
      "invoice_number": "INV-NEXA-20261112-1042",
      "total_amount": 521000,
      "status": "PENDING_PAYMENT",
      "total_items": 1,
      "created_at": "2026-11-12T05:00:00.000Z"
    }
  ]
}
```

---

## 3. Ambil Detail Pesanan Tertentu
Mengambil rincian lengkap pesanan: status barang, detail alamat pengiriman, dan riwayat pembayaran. Dilindungi oleh kepemilikan data (*Ownership BOLA Check*).

* **Method:** `GET`
* **URL:** `/api/orders/:id`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Order detail retrieved successfully",
  "payload": {
    "id": 1042,
    "invoice_number": "INV-NEXA-20261112-1042",
    "status": "PENDING_PAYMENT",
    "total_amount": 521000,
    "shipping": {
      "courier": "JNE REG",
      "tracking_number": null,
      "recipient_name": "Jane Doe",
      "address": "Jl. Senopati No. 88, Jakarta Selatan"
    },
    "items": [
      {
        "product_id": 1,
        "product_name": "Nexa Cyberpunk Oversized Hoodie",
        "size": "M",
        "color": "Black",
        "quantity": 1,
        "price": 499000,
        "image_url": "/uploads/products/hoodie-cyber-1.webp"
      }
    ]
  }
}
```

---

## 4. Batalkan Pesanan (Cancel Order by Customer)
Pelanggan dapat membatalkan pesanan yang masih berstatus `PENDING_PAYMENT`. Sistem secara atomik mengembalikan kuantitas stok varian barang ke katalog.

* **Method:** `PATCH`
* **URL:** `/api/orders/:id/cancel`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Order cancelled successfully and inventory stock has been restored"
}
```

---

## 5. Daftar Seluruh Pesanan Toko (Admin Only)
Menampilkan seluruh transaksi dari semua pelanggan dengan opsi filter status.

* **Method:** `GET`
* **URL:** `/api/orders/admin`
* **Headers:** `Authorization: Bearer <adminToken>`

### Query Parameters:
* `status`: `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `COMPLETED`, `CANCELLED`
* `page`: Int
* `limit`: Int

---

## 6. Perbarui Status Pesanan (Admin Only)
Admin mengubah status siklus hidup pesanan.

* **Method:** `PATCH`
* **URL:** `/api/orders/:id/status`
* **Headers:** `Authorization: Bearer <adminToken>`

### Request Body:
```json
{
  "status": "PROCESSING"
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Order status updated successfully",
  "payload": {
    "order_id": 1042,
    "previous_status": "PAID",
    "current_status": "PROCESSING"
  }
}
```

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Transaksi checkout dilindungi oleh **Idempotency Key (RFC 7240)** di Redis selama 120 detik untuk mencegah duplikasi order akibat double-click atau network timeout.
* Pengurangan stok varian dilakukan secara atomik di dalam database transaction (`withTransaction` / Prisma `$transaction`).
* BOLA (Broken Object Level Authorization) ownership check aktif saat pelanggan melihat detail atau membatalkan pesanan.
* Pembatalan pesanan otomatis mengembalikan stok inventaris ke katalog.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Promo Voucher & Discount Engine (`POST /api/orders/apply-voucher`):**  
   Belum ada sistem kode kupon/voucher diskon (nominal tetap, persentase, minimal belanja, kuota pemakaian per user, batas tanggal kedaluwarsa).
2. **Auto-Expiry Worker on Payment Timeout (24h Order Expiry):**  
   Pesanan yang tidak dibayar dalam 24 jam belum otomatis dibatalkan oleh background cron worker (`node-cron` / BullMQ) untuk membebaskan (*release*) stok produk kembali ke pasaran.
3. **Download PDF Invoice (`GET /api/orders/:id/invoice`):**  
   Belum ada endpoint yang menghasilkan file PDF faktur pembelian resmi (menggunakan library seperti `pdfkit` / Puppeteer) untuk arsip pembukuan pelanggan.
4. **Split Shipment & Multi-Warehouse Fulfillment:**  
   Jika di masa depan toko membuka gudang di Jakarta dan Surabaya, satu pesanan dengan barang berbeda belum mendukung pemisahan pengiriman (*split shipment*) dengan 2 nomor resi kurir terpisah.

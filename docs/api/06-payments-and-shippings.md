# 06. Payments & Shippings API

Modul ini mengelola integrasi payment gateway **Midtrans (Snap API)**, pemrosesan webhook aman berbasis verifikasi signature kriptografis **SHA512**, kalkulasi tarif ongkos kirim logistik, serta pelacakan nomor resi (*Air Waybill / AWB*).

---

## 1. Buat Token Pembayaran Midtrans Snap
Menghasilkan token pembayaran Snap untuk pesanan tertentu. Token ini digunakan oleh frontend SDK Snap untuk membuka popup metode pembayaran (GoPay, QRIS, Virtual Account BCA/Mandiri/BRI, Kartu Kredit).

* **Method:** `POST`
* **URL:** `/api/payments`
* **Headers:** `Authorization: Bearer <accessToken>`

### Request Body:
```json
{
  "order_id": 1042
}
```

### Response Success (`201 Created`):
```json
{
  "status": "success",
  "message": "Payment token generated successfully",
  "payload": {
    "payment_id": 88,
    "order_id": 1042,
    "snap_token": "79b3297a-9a91-4993-9cfa-13f5c9ef8956",
    "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/79b3297a-9a91-4993-9cfa-13f5c9ef8956"
  }
}
```

---

## 2. Ambil Status Pembayaran Berdasarkan Order
Mengambil status mutakhir pembayaran suatu pesanan.

* **Method:** `GET`
* **URL:** `/api/payments/order/:orderId`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Payment status retrieved successfully",
  "payload": {
    "payment_id": 88,
    "order_id": 1042,
    "payment_type": "qris",
    "transaction_status": "settlement",
    "amount": 521000,
    "paid_at": "2026-11-12T05:10:00.000Z"
  }
}
```

---

## 3. Webhook Notifikasi Midtrans (Server-to-Server)
Menerima notifikasi status transaksi otomatis dari server Midtrans.

* **Method:** `POST`
* **URL:** `/api/payments/notification`
* **Auth:** Publik (Dilindungi verifikasi Signature Key SHA512)

### Kriptografi Verifikasi Signature:
Server Nexa memvalidasi keaslian webhook menggunakan formula SHA512:
$$\text{Signature} = \text{SHA512}(\text{order\_id} + \text{status\_code} + \text{gross\_amount} + \text{ServerKey})$$
Jika signature tidak cocok, request langsung ditolak dengan status `403 Forbidden`.

### Request Body dari Midtrans:
```json
{
  "order_id": "INV-NEXA-20261112-1042",
  "status_code": "200",
  "gross_amount": "521000.00",
  "signature_key": "9a8b7c6d5e4f3a2b1c...",
  "transaction_status": "settlement",
  "payment_type": "qris",
  "transaction_time": "2026-11-12 12:10:00"
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Payment notification processed successfully"
}
```
*(Status pesanan di database otomatis diperbarui menjadi `PAID`)*

---

## 4. Hitung Tarif Ongkos Kirim (Shipping Cost Calculator)
Menghitung estimasi biaya pengiriman berdasarkan kota tujuan dan berat total pakaian.

* **Method:** `POST`
* **URL:** `/api/shippings/calculate`
* **Auth:** Publik

### Request Body:
```json
{
  "destination_city_id": 152,
  "weight_grams": 1200,
  "courier": "jne"
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Shipping rates calculated",
  "payload": [
    {
      "service": "JNE REG",
      "description": "Layanan Reguler",
      "cost": 22000,
      "estimated_days": "1-2 Hari"
    },
    {
      "service": "JNE YES",
      "description": "Yakin Esok Sampai",
      "cost": 38000,
      "estimated_days": "1 Hari"
    }
  ]
}
```

---

## 5. Ambil Informasi Pengiriman Pesanan
* **Method:** `GET`
* **URL:** `/api/shippings/order/:orderId`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Shipping details retrieved",
  "payload": {
    "order_id": 1042,
    "courier": "JNE REG",
    "tracking_number": "JNE-CGK-889922001",
    "shipping_status": "IN_TRANSIT",
    "recipient_name": "Jane Doe",
    "address": "Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan"
  }
}
```

---

## 6. Input / Perbarui Nomor Resi Pengiriman (Admin Only)
Admin memasukkan nomor resi ekspedisi dan mengubah status pesanan menjadi `SHIPPED`.

* **Method:** `PATCH`
* **URL:** `/api/shippings/order/:orderId`
* **Headers:** `Authorization: Bearer <adminToken>`

### Request Body:
```json
{
  "tracking_number": "JNE-CGK-889922001",
  "shipping_status": "SHIPPED"
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Shipping status and tracking number updated successfully"
}
```

---

## 7. Konfirmasi Pesanan Selesai / Diterima (Complete Order)
Pelanggan mengonfirmasi bahwa paket pakaian streetwear telah diterima dengan baik.

* **Method:** `PATCH`
* **URL:** `/api/shippings/order/:orderId/complete`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Order marked as completed"
}
```
*(Status pesanan berubah menjadi `COMPLETED`)*

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Integrasi Midtrans Snap API untuk penerbitan token pembayaran (QRIS, VA, E-Wallet).
* Webhook notifikasi server-to-server dilindungi verifikasi kriptografi signature **SHA512** untuk mencegah fake webhook callbacks.
* Pengubahan status pesanan otomatis ke `PAID` saat menerima status settlement dari payment gateway.
* Manajemen status logistik dan penginputan nomor resi pengiriman (AWB).

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Live Courier Aggregator API Integration (Biteship / RajaOngkir Pro):**  
   Kalkulasi ongkir saat ini masih menggunakan kalkulator tarif statis/mock di controller. Standar mentok e-commerce membutuhkan integrasi API kurir langsung (JNE, J&T, SiCepat, Anteraja) berdasarkan koordinat kecamatan/kelurahan dan dimensi volume paket.
2. **Automated Courier Tracking Webhook:**  
   Pelacakan status paket saat ini bergantung pada update manual admin. Batasan mentoknya adalah menerima webhook langsung dari ekspedisi pengiriman (contoh dari webhook Biteship/Shipper) sehingga status otomatis berubah dari *Picked Up* $\to$ *In Transit* $\to$ *Delivered* tanpa intervensi manusia.
3. **Automated Refund API Integration:**  
   Jika order dibatalkan oleh pembeli atau stok gudang fisik kosong setelah pembayaran berhasil, pengembalian dana (*refund*) masih harus diproses manual di dashboard Midtrans. Batasan mentoknya adalah endpoint `POST /api/payments/:id/refund` yang langsung memanggil Midtrans Direct Refund API.

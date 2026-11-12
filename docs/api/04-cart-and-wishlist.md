# 04. Cart & Wishlist API

Modul ini mengelola keranjang belanja pengguna (*shopping cart*), mutasi kuantitas item dengan validasi ketersediaan stok produk, serta daftar keinginan (*wishlist*) barang favorit.

---

## 1. Ambil Keranjang Belanja Pelanggan
Mengambil data keranjang aktif milik user terotentikasi.

* **Method:** `GET`
* **URL:** `/api/carts`
* **Headers:** `Authorization: Bearer <accessToken>`
* **Cache:** Di-cache di Redis per pengguna (`cacheUserResponse(600, "cart")`).

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Cart retrieved successfully",
  "payload": {
    "cart_id": 18,
    "user_id": 42,
    "total_items": 2,
    "subtotal": 898000,
    "items": [
      {
        "id": 55,
        "product_id": 1,
        "variant_id": 10,
        "name": "Nexa Cyberpunk Oversized Hoodie",
        "size": "M",
        "color": "Black",
        "price": 499000,
        "quantity": 1,
        "item_subtotal": 499000,
        "image_url": "/uploads/products/hoodie-cyber-1.webp",
        "available_stock": 25
      },
      {
        "id": 56,
        "product_id": 4,
        "variant_id": 22,
        "name": "Nexa Heavy Tee Acid Wash",
        "size": "L",
        "color": "Charcoal",
        "price": 399000,
        "quantity": 1,
        "item_subtotal": 399000,
        "image_url": "/uploads/products/tee-acid-1.webp",
        "available_stock": 14
      }
    ]
  }
}
```

---

## 2. Tambah Produk ke Keranjang Belanja
Menambahkan varian produk tertentu ke dalam keranjang belanja. Sistem otomatis memvalidasi apakah jumlah yang diminta melebihi sisa stok riil.

* **Method:** `POST`
* **URL:** `/api/carts/items`
* **Headers:** `Authorization: Bearer <accessToken>`

### Request Body:
```json
{
  "product_id": 1,
  "variant_id": 10,
  "quantity": 2
}
```

### Response Success (`201 Created`):
```json
{
  "status": "success",
  "message": "Item added to cart successfully",
  "payload": {
    "item_id": 57,
    "variant_id": 10,
    "quantity": 2
  }
}
```
*(Catatan: Cache keranjang user otomatis di-invalidate via `invalidateUserCache("cart")`)*

---

## 3. Perbarui Kuantitas Item Keranjang
Mengubah jumlah barang belanjaan di keranjang.

* **Method:** `PATCH`
* **URL:** `/api/carts/items/:id`
* **Headers:** `Authorization: Bearer <accessToken>`

### Request Body:
```json
{
  "quantity": 3
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Cart item updated successfully",
  "payload": {
    "item_id": 55,
    "quantity": 3
  }
}
```

---

## 4. Hapus Item dari Keranjang
Menghapus varian barang tertentu dari keranjang belanja.

* **Method:** `DELETE`
* **URL:** `/api/carts/items/:id`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Item removed from cart"
}
```

---

## 5. Ambil Daftar Wishlist Pelanggan
Mengambil daftar seluruh produk yang ditandai sebagai favorit oleh user.

* **Method:** `GET`
* **URL:** `/api/wishlist`
* **Headers:** `Authorization: Bearer <accessToken>`

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Wishlist retrieved successfully",
  "payload": [
    {
      "id": 9,
      "product_id": 1,
      "name": "Nexa Cyberpunk Oversized Hoodie",
      "slug": "nexa-cyberpunk-oversized-hoodie",
      "price": 499000,
      "image_url": "/uploads/products/hoodie-cyber-1.webp",
      "added_at": "2026-11-01T10:15:00.000Z"
    }
  ]
}
```

---

## 6. Toggle Wishlist (Tambah / Hapus Favorit)
Secara cerdas menambahkan produk ke wishlist jika belum ada, atau menghapusnya jika produk sudah pernah ditambahkan.

* **Method:** `POST`
* **URL:** `/api/wishlist/toggle`
* **Headers:** `Authorization: Bearer <accessToken>`

### Request Body:
```json
{
  "product_id": 1
}
```

### Response Success (`200 OK`):
```json
{
  "status": "success",
  "message": "Product added to wishlist",
  "payload": {
    "product_id": 1,
    "is_in_wishlist": true
  }
}
```
*(Atau `message: "Product removed from wishlist"` dengan `is_in_wishlist: false`)*

---

## Review Senior Backend: Analisis Gap & Batasan Mentok Implementasi

### Status Saat Ini:
* Keranjang belanja mendukung kalkulasi subtotal otomatis, pengecekan ketersediaan stok riil varian, dan caching Redis per-user (`cacheUserResponse`).
* Mutasi kuantitas dan penghapusan item keranjang secara atomik.
* Fitur Wishlist toggle (tambah/hapus) berbasis indeks unik user-produk.

### Hal yang Belum Diimplementasikan (Menuju Standar Tertinggi / Batasan Mentok):
1. **Guest Cart to Authenticated User Cart Merge (`POST /api/carts/merge`):**  
   Pengguna belum bisa berbelanja anonim (tanpa login) dengan keranjang yang tersimpan di localStorage/cookie guest, lalu otomatis digabungkan (*merged*) ke database akun setelah mereka login. Batasan mentoknya menggabungkan kuantitas varian yang sama dan memvalidasi batas stok maksimal.
2. **Dynamic Price Change & Out-of-Stock Guard di Keranjang:**  
   Jika admin menaikkan harga atau stok barang habis saat item masih tersimpan di keranjang user, belum ada indikator peringatan *"Harga barang X telah diperbarui dari Rp A menjadi Rp B"* atau tanda *"Stok Tidak Tersedia"* sebelum checkout.
3. **Abandoned Cart Recovery Pipeline:**  
   Belum ada background worker (seperti BullMQ cron) yang mendeteksi keranjang belanja yang ditinggalkan lebih dari 24 jam untuk mengirim email pengingat (*Abandoned Cart Reminder*) dengan penawaran diskon khusus.

# 07. Role-Based Access Control (RBAC) & Privilege Separation

## 1. Masalah yang Terjadi (Vulnerability Anatomy & Real-World Risks)

Kegagalan kontrol akses (*Broken Access Control*) secara konsisten menempati **peringkat #1 pada OWASP Top 10 (A01:2021 – Broken Access Control)**.

Di aplikasi e-commerce, celah otorisasi biasanya muncul dalam dua bentuk kerentanan fatal:

```mermaid
flowchart TD
    Attacker["User Biasa / Attacker"]
    
    Attacker -->|1. Broken Function Level Authorization (BFLA)| AdminEndpoint["POST /api/products<br/>(Menambah Produk / Mengubah Harga)"]
    Attacker -->|2. Broken Object Level Authorization (BOLA/IDOR)| UserEndpoint["GET /api/orders/55<br/>(Membaca Pesanan Customer Lain)"]
    Attacker -->|3. Privilege Escalation (Mass Assignment)| RegisterEndpoint["POST /api/auth/register<br/>(Body: 'role': 'admin')"]

    AdminEndpoint -->|Tanpa RBAC| Disaster1["Attacker Mengubah Status Order Jadi 'Paid' Gratis"]
    UserEndpoint -->|Tanpa Ownership Check| Disaster2["Kebocoran Data Pribadi Customer (Nama, Alamat, HP)"]
    RegisterEndpoint -->|Tanpa DTO Filtering| Disaster3["Attacker Menjadi Superadmin Secara Instan"]

    style Attacker fill:#ffdddd,stroke:#d9534f
    style AdminEndpoint fill:#fff0db,stroke:#f0ad4e
    style UserEndpoint fill:#fff0db,stroke:#f0ad4e
    style RegisterEndpoint fill:#fff0db,stroke:#f0ad4e
    style Disaster1 fill:#f2dede,stroke:#a94442
    style Disaster2 fill:#f2dede,stroke:#a94442
    style Disaster3 fill:#f2dede,stroke:#a94442
```

### Vektor Serangan Nyata pada E-Commerce:

1. **Manipulasi Status Pesanan (BFLA):**
   * Customer biasa mengirimkan `PATCH /api/orders/10/status` dengan body `{"status": "paid"}`. Tanpa RBAC, sistem mengubah status pesanan belum bayar menjadi lunas tanpa pembayaran Midtrans.
2. **Eskalasi Hak Akses (Privilege Escalation):**
   * Saat registrasi akun atau update profil, penyerang menyisipkan property JSON `{"role": "admin"}`. Jika backend melakukan `prisma.users.create({ data: req.body })` secara mentah (*Mass Assignment*), akun penyerang langsung menjadi admin toko.
3. **Pencurian Riwayat Belanja & Alamat (BOLA / IDOR):**
   * User A membuka URL `/api/orders/12`. Lalu user A mengganti angka URL menjadi `/api/orders/13`. Tanpa pengecekan kepemilikan (*Data Ownership Verification*), user A bisa melihat nama, nomor HP, dan alamat rumah milik pembeli lain.

---

## 2. Solusi Best Practice (Prinsip Otorisasi OWASP)

Project **Nexa Streetwear** menerapkan 4 pilar kontrol akses:

1. **Prinsip Hak Akses Minimal (*Principle of Least Privilege*):**
   * Semua pengguna yang mendaftar secara otomatis hanya diberikan peran terendah: `user` (Customer).
2. **Penyaringan DTO Ketat (Zero Role Tampering):**
   * Field `role` tidak pernah diterima dari input body pengguna saat registrasi atau update profil. Penetapan role admin hanya bisa dilakukan langsung di database oleh DBA / Superadmin.
3. **Pemisahan Autentikasi vs Otorisasi (401 vs 403):**
   * **401 Unauthorized:** Pengguna belum login atau token kedaluwarsa.
   * **403 Forbidden:** Pengguna sudah login, namun peran (*role*) akunnya tidak memiliki wewenang untuk mengeksekusi aksi tersebut.
4. **Validasi Kepemilikan Data Ganda (RBAC + Ownership):**
   * Untuk resource sensitif (seperti keranjang, alamat, dan pesanan), sistem memeriksa dua hal:
     * Apakah pemanggil adalah `admin`? (Boleh akses).
     * Jika bukan admin, apakah `record.user_id === req.user.id`? (Hanya pemilik data yang boleh akses).

---

## 3. Matriks Hak Akses (Role-Permission Matrix)

Berikut adalah pembagian wewenang resmi di project Nexa:

| Modul / Tindakan | Endpoint API | Publik (Guest) | Pelanggan (`user`) | Administrator (`admin`) |
|:---|:---|:---:|:---:|:---:|
| **Katalog Produk** | `GET /api/products` | ✅ Ya | ✅ Ya | ✅ Ya |
| **Tambah / Edit Produk** | `POST/PATCH/DELETE /api/products` | ❌ Ditolak (401) | ❌ Ditolak (403) | ✅ **Diizinkan** |
| **Kategori Produk** | `POST/DELETE /api/categories` | ❌ Ditolak (401) | ❌ Ditolak (403) | ✅ **Diizinkan** |
| **Kelola Keranjang** | `POST/PATCH/DELETE /api/carts` | ❌ Ditolak (401) | ✅ Hanya Milik Sendiri | ✅ Hanya Milik Sendiri |
| **Checkout & Buat Order** | `POST /api/orders` | ❌ Ditolak (401) | ✅ Ya | ✅ Ya |
| **Lihat Detail Order** | `GET /api/orders/:id` | ❌ Ditolak (401) | ✅ Hanya Milik Sendiri | ✅ **Semua Order** |
| **Lihat Semua Order Toko** | `GET /api/orders/admin` | ❌ Ditolak (401) | ❌ Ditolak (403) | ✅ **Diizinkan** |
| **Ubah Status Pesanan** | `PATCH /api/orders/:id/status` | ❌ Ditolak (401) | ❌ Ditolak (403) | ✅ **Diizinkan** |
| **Update Status Resi Kirim**| `PATCH /api/shippings/order/:id` | ❌ Ditolak (401) | ❌ Ditolak (403) | ✅ **Diizinkan** |
| **Buku Alamat Pengiriman** | `GET/POST/PATCH/DELETE /api/addresses` | ❌ Ditolak (401) | ✅ Hanya Milik Sendiri | ✅ Hanya Milik Sendiri |

---

## 4. Implementasi Nyata di Codebase Project

### A. Middleware Otorisasi RBAC di [`backend/src/middleware/adminMiddleware.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/adminMiddleware.ts#L8-L31)

```typescript
// backend/src/middleware/adminMiddleware.ts
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    // 1. Verifikasi Autentikasi (401 Unauthorized)
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized: Authentication required before checking roles",
      });
    }

    const userRole = user.role;

    // 2. Verifikasi Otorisasi Peran (403 Forbidden)
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        status: "fail",
        message: `Forbidden: Access restricted to [${allowedRoles.join(", ")}] roles only.`,
      });
    }

    next();
  };
};

export const verifyAdmin = authorizeRoles("admin");
```

---

### B. Proteksi Endpoint Admin pada Routing Modul

Contoh pada rute manajemen pesanan dan katalog produk:

[`backend/src/modules/order/order.routes.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.routes.ts#L11-L14)
```typescript
// Hanya admin yang bisa melihat rekap seluruh pesanan toko & mengubah status transaksi
router.get("/admin", verifyAccessToken, verifyAdmin, OrderController.getAllOrdersForAdmin);
router.patch("/:id/status", verifyAccessToken, verifyAdmin, OrderController.updateOrderStatusByAdmin);
```

[`backend/src/modules/product/product.routes.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.routes.ts#L11-L33)
```typescript
// Hanya admin yang berhak menambah, mengubah harga, dan menghapus produk katalog
router.post("/", verifyAccessToken, verifyAdmin, uploadProductImage, invalidateCache("products"), ProductController.createProduct);
router.patch("/:id", verifyAccessToken, verifyAdmin, uploadProductImage, invalidateCache("products"), ProductController.updateProduct);
router.delete("/:id", verifyAccessToken, verifyAdmin, invalidateCache("products"), ProductController.deleteProduct);
```

---

### C. Proteksi Anti-Escalation (Mencegah Inject Role Admin)

Di [`backend/src/modules/auth/auth.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/auth/auth.model.ts#L26-L34), field `role` tidak di-ekspos pada input pembuatan user:

```typescript
// backend/src/modules/auth/auth.model.ts
static async createUser({ name, email, password }: UserRegisterDTO): Promise<UserResponse> {
  const user = await prisma.users.create({
    data: {
      name,
      email,
      password,
      // role tidak diambil dari payload, otomatis default ke 'user' di schema database
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return user;
}
```

Dan di [`backend/src/modules/user/user.model.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/user/user.model.ts#L31-L34), update profil pelanggan dibatasi secara eksplisit (*whitelisted fields*):

```typescript
// backend/src/modules/user/user.model.ts
static async updateProfile(id: number, { name, phone }: UpdateProfileDTO) {
  return await prisma.users.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      // role TIDAK BISA diubah lewat endpoint profil!
    },
  });
}
```

---

### D. Verifikasi Kepemilikan Data (BOLA / Ownership Guard)

Di [`backend/src/modules/order/order.service.ts`](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L138-L143):

```typescript
// backend/src/modules/order/order.service.ts
static async getOrderDetail(userId: number, orderId: number, userRole = "customer") {
  const order = await OrderModel.getOrderById(null, orderId);

  // Jika bukan pemilik pesanan DAN bukan admin, sembunyikan keberadaan order
  if (!order || (order.user_id !== userId && userRole !== "admin")) {
    throw new AppError("Order not found", 404);
  }
  ...
}
```

---

## 5. Simulasi Pengujian Keamanan (Security Verification)

### Skenario A: Customer Mencoba Mengubah Status Pesanan Menjadi Paid
* **Aktor:** Customer biasa (`role: "user"`).
* **Request:** `PATCH /api/orders/5/status` (Header: `Authorization: Bearer <CustomerToken>`).
* **Hasil Eksekusi:**
  * Middleware `verifyAccessToken` meloloskan token (karena token valid).
  * Middleware `verifyAdmin` mengecek `user.role === 'admin'`.
  * Sistem menolak dengan **`HTTP 403 Forbidden`**:
    ```json
    {
      "status": "fail",
      "message": "Forbidden: Access restricted to [admin] roles only."
    }
    ```

### Skenario B: Customer Mencoba Mengintip Pesanan Milik Customer Lain
* **Aktor:** Customer ID `10`.
* **Request:** `GET /api/orders/88` (Di mana order 88 adalah milik Customer ID `25`).
* **Hasil Eksekusi:**
  * Service memeriksa `order.user_id !== userId && userRole !== 'admin'`.
  * Sistem merespons dengan **`HTTP 404 Not Found`**:
    ```json
    {
      "status": "fail",
      "message": "Order not found"
    }
    ```
  * Sistem sengaja mengembalikan status `404` (bukan 403) agar penyerang tidak bisa melakukan *ID Harvesting / Enumeration* untuk menebak ID pesanan yang valid.

---

## 6. Developer RBAC Checklist

- [x] **Deny by Default:** Seluruh endpoint administratif mewajibkan `verifyAccessToken` dan `verifyAdmin`.
- [x] **Zero Role Mass Assignment:** Field `role` tidak pernah diterima dari input body pengguna pada pendaftaran atau edit profil.
- [x] **Semantic HTTP Status Codes:** Mengembalikan status `401 Unauthorized` jika belum login, dan `403 Forbidden` jika salah hak akses peran.
- [x] **BOLA / IDOR Protection:** Seluruh resource kepemilikan (`cart`, `order`, `address`) mencocokkan `user_id` dari JWT payload `req.user.id`.
- [x] **Safe Information Masking:** Mencari order/alamat milik orang lain mengembalikan `404 Not Found` alih-alih membocorkan eksistensi data.

---

## 7. Evaluasi & Gap Analysis Standar Industri (Batasan Mentok)

Sebagai Senior Backend Engineer, berikut adalah hasil audit komparatif antara implementasi RBAC saat ini dengan standar tata kelola otorisasi perusahaan skala enterprise (Fintech, SaaS, & Marketplace Tier-1):

### A. Komponen yang Sudah Teruji & Solid (Production-Ready)
1. **Strict Ownership Guard (Anti BOLA/IDOR):** Pemeriksaan `order.user_id !== userId` dengan penyembunyian status 404 telah melindungi privasi data pelanggan dari teknik enumerasi ID.
2. **Anti-Escalation Mass Assignment Defense:** Field `role` dibatasi secara ketat di layer Prisma model dan tidak dapat disusupi lewat payload JSON pengguna saat registrasi atau pembaruan profil.
3. **Pemisahan Semantik 401 vs 403:** Arsitektur middleware memisahkan dengan tegas antara identifikasi identitas (401) dan batas kewenangan peran (403).

### B. Gap Analysis: Hal yang Belum Diterapkan Menuju "Batasan Mentok"

| Pilar Tata Kelola Hak Akses | Kondisi Saat Ini di Codebase | Standar Batasan Mentok (Enterprise Grade) | Dampak & Urgensi |
| :--- | :--- | :--- | :--- |
| **Granular Permission-Based (PBAC) vs Static Role** | Role bersifat monolitik biner (`admin` vs `user`). Admin memiliki akses ke seluruh fitur tanpa sekat. | Memisahkan peran ke dalam matriks izin spesifik (*Granular Permissions*): `order:read`, `order:ship`, `product:write`, `finance:read`. | **Tinggi (P1):** Staf gudang (*fulfillment*) atau Customer Service (CS) terpaksa diberikan akun `admin` penuh, sehingga mereka secara teknis bisa mengubah harga produk atau melihat rahasia finansial toko. |
| **Real-Time Role/Session Revocation** | Perubahan role di database tidak langsung membatalkan akses admin yang sedang berjalan karena role tertanam di stateless JWT (berlaku hingga 15 menit). | Redis Role Versioning (`role_version`) atau Redis Session Invalidation yang memutus sesi admin secara seketika (*instant cutoff*) saat hak akses dicabut oleh Superadmin. | **Tinggi (P1):** Karyawan yang diberhentikan atau akun admin yang diretas masih bisa mengeksekusi aksi destruktif selama sisa masa berlaku access token JWT belum expired. |
| **Attribute-Based Access Control (ABAC)** | Otorisasi hanya melihat status role dan ID pemilik data secara statis. | Kebijakan akses dinamis berbasis atribut (ABAC / Policy-as-Code via OPA): misal admin cabang A hanya boleh memproses order di wilayahnya, atau staf CS hanya boleh memproses refund dengan nilai di bawah Rp 1.000.000. | **Sedang (P2):** Diperlukan saat organisasi toko bertumbuh memiliki multi-cabang atau multi-warehouse logistik. |
| **Maker-Checker Dual Approval (Four-Eyes Principle)** | Satu orang admin dapat mengeksekusi penghapusan massal atau perubahan harga diskon ekstrem secara sepihak. | Tindakan berisiko tinggi (*high-risk mutation*) mewajibkan persetujuan (*approval*) dari 2 admin independen sebelum diterapkan ke database. | **Sedang (P2):** Mencegah insiden *fat-finger error* (salah ketik harga diskon) atau sabotase oleh orang dalam (*rogue internal actor*). |
| **Impersonation / Ghost-Login Audit Trail** | Belum ada mekanisme legal bagi tim support untuk mereproduksi bug dengan login atas nama pelanggan. | Fitur *Admin User Impersonation* resmi dengan JWT bertanda khusus (`impersonated_by: admin_id`) dan pencatatan audit log otomatis untuk setiap klik. | **Rendah (P3):** Mempermudah investigasi bug teknis pesanan pelanggan tanpa harus meminta password asli pelanggan. |

### C. Rekomendasi Roadmap Implementasi
1. **Prioritas Terdekat (Role Decomposition):** Tambahkan tabel `permissions` dan `role_permissions` di Prisma untuk memecah role admin menjadi `superadmin`, `warehouse_staff`, dan `support_cs`.
2. **Prioritas Menengah (Instant Role Cutoff):** Simpan `role_version` di Redis untuk mengecek keabsahan hak akses admin pada rute-rute mutasi sensitif tanpa membebani query PostgreSQL.

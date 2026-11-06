# Implementation Plan - Restructure & Modularize React Frontend to TypeScript (`src/modules`)

Rombak total arsitektur frontend React dari struktur flat `pages/` & `components/` menjadi **Modular Feature-Based Architecture** di folder `src/modules/` sesuai referensi arsitektur yang diberikan (YouTube structure), serta **konversi penuh ke TypeScript (`.tsx` / `.ts`)**.

## User Review Required

> [!IMPORTANT]
> **Skop Perubahan Besar (Major Refactoring)**:
> 1. Konversi seluruh file JavaScript (`.jsx` / `.js`) di `frontend/src/` menjadi TypeScript (`.tsx` / `.ts`) dengan definisi interface/type data yang ketat.
> 2. Penataan ulang folder dari `src/pages` & `src/components` ke struktur modul per fitur: `src/modules/{auth, home, catalog, product-detail, cart, checkout, profile, admin, shared}`.
> 3. Setiap folder modul akan memiliki `index.tsx` sebagai *barrel export* (entry point module).
> 4. Ekstraksi state & API logic yang menumpuk di file page besar menjadi Custom Hooks (`useProductCatalog`, `useCheckout`, `useAdminDashboard`, dll) dan sub-komponen UI modular.

---

## Proposed Changes

### Configuration & Tooling
#### [NEW] [tsconfig.json](file:///home/allrole/Documents/Learning/Streetwear/frontend/tsconfig.json)
#### [NEW] [tsconfig.app.json](file:///home/allrole/Documents/Learning/Streetwear/frontend/tsconfig.app.json)
#### [NEW] [src/vite-env.d.ts](file:///home/allrole/Documents/Learning/Streetwear/frontend/src/vite-env.d.ts)
#### [MODIFY] [package.json](file:///home/allrole/Documents/Learning/Streetwear/frontend/package.json)
- Menambahkan `typescript` ke devDependencies dan script `type-check` (`tsc --noEmit`).
#### [MODIFY] [index.html](file:///home/allrole/Documents/Learning/Streetwear/frontend/index.html)
- Mengubah referensi script dari `/src/main.jsx` ke `/src/main.tsx`.

---

### Core Data Models / Types
#### [NEW] [src/types/index.ts](file:///home/allrole/Documents/Learning/Streetwear/frontend/src/types/index.ts)
- Definisi tipe data global: `Product`, `Category`, `User`, `CartItem`, `Cart`, `Address`, `Order`, `Payment`, `AdminStats`, `FilterState`, dll.

---

### Shared Infrastructure (`src/shared/`)
#### [NEW] [src/shared/services/api.ts](file:///home/allrole/Documents/Learning/Streetwear/frontend/src/shared/services/api.ts)
- Migrasi `src/api/api.js` ke TypeScript Axios instance.
#### [NEW] [src/shared/utils/imageUrl.ts](file:///home/allrole/Documents/Learning/Streetwear/frontend/src/shared/utils/imageUrl.ts)
- Helper penyusun URL gambar.
#### [NEW] [src/shared/components/](file:///home/allrole/Documents/Learning/Streetwear/frontend/src/shared/components/)
- `Navbar.tsx`, `Footer.tsx`, `Button.tsx`, `Modal.tsx`, `LoadingSpinner.tsx`, `ProtectedRoute.tsx`, `EmptyState.tsx`.
#### [NEW] [src/shared/index.ts](file:///home/allrole/Documents/Learning/Streetwear/frontend/src/shared/index.ts)
- Barrel export untuk komponen & service shared.

---

### Feature Modules (`src/modules/`)

#### 1. Module `auth` (`src/modules/auth/`)
- **`components/AuthInputs.tsx`**
- **`context/AuthContext.tsx`** (dan `useAuth.ts`)
- **`schemas/authSchema.ts`**
- **`index.tsx`**: Export `Login`, `Register`, `AuthProvider`, `useAuth`.

#### 2. Module `home` (`src/modules/home/`)
- **`components/Hero.tsx`**, **`CategorySection.tsx`**, **`PromoBanner.tsx`**, **`FeatureGrid.tsx`**
- **`index.tsx`**: Export `LandingPage`.

#### 3. Module `catalog` (`src/modules/catalog/`)
- **`components/ProductCard.tsx`**, **`FilterSidebar.tsx`**, **`CatalogHeader.tsx`**, **`MobileFilterDrawer.tsx`**, **`ProductGrid.tsx`**
- **`hooks/useProductCatalog.ts`**: Ekstraksi logika filter, search, & pagination dari `ProductCatalog.jsx` (696 baris).
- **`constants/catalogOptions.ts`**: Menampung daftar brand, kategori, harga, warna.
- **`services/catalogApi.ts`**: Interaksi API produk.
- **`index.tsx`**: Export `ProductCatalog`.

#### 4. Module `product-detail` (`src/modules/product-detail/`)
- **`components/ImageGallery.tsx`**, **`ProductInfo.tsx`**, **`ReviewSection.tsx`**
- **`hooks/useProductDetail.ts`**
- **`index.tsx`**: Export `ProductDetail`.

#### 5. Module `cart` (`src/modules/cart/`)
- **`components/CartItemList.tsx`**, **`CartSummary.tsx`**
- **`context/CartContext.tsx`** & **`hooks/useCart.ts`**
- **`services/cartApi.ts`**
- **`index.tsx`**: Export `Cart`, `CartProvider`, `useCart`.

#### 6. Module `checkout` (`src/modules/checkout/`)
- **`components/AddressSelector.tsx`**, **`AddAddressModal.tsx`**, **`ShippingMethod.tsx`**, **`PaymentMethod.tsx`**, **`OrderSummary.tsx`**
- **`hooks/useCheckout.ts`**: Ekstraksi logika transaksi & form alamat dari `Checkout.jsx` (447 baris).
- **`services/checkoutApi.ts`**
- **`index.tsx`**: Export `Checkout`.

#### 7. Module `profile` (`src/modules/profile/`)
- **`components/ProfileHeader.tsx`**, **`AddressList.tsx`**, **`OrderHistoryList.tsx`**
- **`hooks/useUserProfile.ts`**, **`useOrderHistory.ts`**
- **`index.tsx`**: Export `UserProfile`, `OrderHistory`.

#### 8. Module `admin` (`src/modules/admin/`)
- **`components/OverviewCards.tsx`**, **`RecentOrdersTable.tsx`**, **`ProductModal.tsx`**, **`OrderStatusModal.tsx`**, **`DiscountModal.tsx`**
- **`hooks/useAdminDashboard.ts`**, **`useManageProducts.ts`**, **`useManageOrders.ts`**
- **`services/adminApi.ts`**
- **`index.tsx`**: Export `Dashboard`, `ManageOrders`, `ManageProduct`, `ManageDiscount`.

---

### App Router Clean Up
#### [NEW] [src/App.tsx](file:///home/allrole/Documents/Learning/Streetwear/frontend/src/App.tsx)
- Mengimpor halaman dari `src/modules/{moduleName}`.
#### [NEW] [src/main.tsx](file:///home/allrole/Documents/Learning/Streetwear/frontend/src/main.tsx)
- Entry point TypeScript murni.

#### [DELETE] Hapus folder lama yang sudah ditata ulang:
- `src/pages/`, `src/api/`, `src/schemas/`, `src/services/`, `src/utils/`, `src/context/`, `src/hooks/`, `src/components/`.

---

## Verification Plan

### Automated Verification
- Menjalankan type-check TypeScript:
  ```bash
  npx tsc --noEmit
  ```
- Menjalankan build produksi Vite untuk memastikan tidak ada import error atau type errors:
  ```bash
  npm run build
  ```

### Manual Verification
- Menjalankan server dev (`npm run dev`) dan memverifikasi seluruh alur navigasi (Landing Page -> Katalog -> Detail Produk -> Cart -> Checkout -> Profile -> Admin Dashboard) berjalan lancar tanpa error di console.

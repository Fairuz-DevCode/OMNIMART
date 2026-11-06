import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar, Footer, ProtectedRoute } from './shared';
import { ToastProvider } from './shared/components/Toast';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

import { AuthProvider, Login, Register } from './modules/auth';
import { LandingPage } from './modules/home';
import { ProductCatalog } from './modules/catalog';
import { ProductDetail } from './modules/product-detail';
import { CartProvider, Cart } from './modules/cart';
import { Checkout } from './modules/checkout';
import { UserProfile, OrderHistory, WishlistPage } from './modules/profile';
import { Dashboard, ManageOrders, ManageProduct, ManageDiscount } from './modules/admin';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Router>
              <Navbar />
              <main className="pt-14 min-h-screen bg-[#FAFAF8] text-gray-900">
                <Routes>
              {/* RUTE PUBLIK (GUEST) */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/product" element={<ProductCatalog />} />
              <Route path="/product/:id" element={<ProductDetail />} />

              {/* RUTE USER (login) */}
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <OrderHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <WishlistPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={['user', 'admin']}>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />

              {/* RUTE ADMIN */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageProduct />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/discount"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageDiscount />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </Router>
      </CartProvider>
    </AuthProvider>
  </ToastProvider>
</ErrorBoundary>
  );
};

export default App;

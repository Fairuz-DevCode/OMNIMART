import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getCart, addCartItem, updateCartItem, removeCartItem } from '../services/cartApi';
import { useAuth } from '../../auth';
import { CartData } from '../../../types';

interface CartContextType {
  cartData: CartData;
  cartLoading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (product_id: number | string, product_variant_id?: number | string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: number | string, quantity: number) => Promise<void>;
  removeItem: (itemId: number | string) => Promise<void>;
  clearCart: () => void;
  getCartCount: () => number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [cartData, setCartData] = useState<CartData>({ items: [], total_price: 0 });
  const [cartLoading, setCartLoading] = useState<boolean>(false);

  const fetchCart = useCallback(async () => {
    if (!currentUser) {
      setCartData({ items: [], total_price: 0 });
      return;
    }
    try {
      setCartLoading(true);
      const data = await getCart();
      setCartData(data || { items: [], total_price: 0 });
    } catch {
      setCartData({ items: [], total_price: 0 });
    } finally {
      setCartLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(async (product_id: number | string, product_variant_id?: number | string, quantity = 1) => {
    await addCartItem({ product_id, product_variant_id, quantity });
    await fetchCart();
  }, [fetchCart]);

  const updateQuantity = useCallback(async (itemId: number | string, quantity: number) => {
    await updateCartItem(itemId, quantity);
    await fetchCart();
  }, [fetchCart]);

  const removeItem = useCallback(async (itemId: number | string) => {
    await removeCartItem(itemId);
    await fetchCart();
  }, [fetchCart]);

  const clearCart = useCallback(() => {
    setCartData({ items: [], total_price: 0 });
  }, []);

  const getCartCount = () =>
    cartData.items?.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider
      value={{
        cartData,
        cartLoading,
        fetchCart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart harus digunakan di dalam CartProvider');
  }
  return context;
};

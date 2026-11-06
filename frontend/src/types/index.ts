export interface User {
  id: number | string;
  username: string;
  email: string;
  role: 'user' | 'admin' | string;
  avatar?: string;
  phone?: string;
}

export interface Product {
  id: number | string;
  name: string;
  description?: string;
  price: number;
  oldPrice?: number;
  stock?: number;
  category_id?: number | string;
  category?: string;
  img_url?: string;
  image?: string;
  sub?: string;
  rating?: number;
  gender?: string;
  brand?: string;
  color?: string;
  material?: string;
  sole?: string;
  is_popular?: boolean;
}

export interface Category {
  id: number | string;
  name: string;
  img_url?: string;
}

export interface CartItem {
  id?: number | string;
  product_id: number | string;
  quantity: number;
  size?: string;
  Product?: Product;
  product?: Product;
}

export interface CartData {
  items: CartItem[];
  total_price: number;
  total_items?: number;
}

export interface Address {
  id?: number | string;
  user_id?: number | string;
  label: string;
  phone: string;
  street_address: string;
  city: string;
  country: string;
  postal_code: string;
  is_default?: boolean;
}

export interface OrderItem {
  id?: number | string;
  order_id?: number | string;
  product_id: number | string;
  quantity: number;
  price: number;
  Product?: Product;
}

export interface Order {
  id: number | string;
  user_id?: number | string;
  total_price: number;
  shipping_cost?: number;
  status: string; // 'pending', 'paid', 'shipped', 'completed', 'cancelled'
  shipping_address?: string | Address;
  courier?: string;
  created_at?: string;
  items?: OrderItem[];
  Payment?: {
    id?: number | string;
    payment_method?: string;
    status?: string;
    amount?: number;
  };
}

export interface CatalogFilterState {
  selectedTopCategory: string;
  selectedGenders: string[];
  selectedBrands: string[];
  selectedPriceRange: string;
  selectedColors: string[];
  selectedMaterials: string[];
  selectedSoles: string[];
  searchQuery: string;
}

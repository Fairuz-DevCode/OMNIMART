export interface AddCartItemDTO {
  product_id: number;
  product_variant_id: number;
  quantity: number;
}

export interface UpdateCartItemDTO {
  quantity: number;
}

export interface CartItemFormatted {
  id: number;
  product_id: number;
  product_name: string;
  product_variant_id: number;
  size: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CartResponse {
  id: number;
  user_id: number;
  items: CartItemFormatted[];
  total_price: number;
}

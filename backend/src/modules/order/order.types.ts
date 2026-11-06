export interface CreateOrderDTO {
  address_id: number;
  shipping_cost: number;
}

export interface OrderItemResponse {
  id: number;
  product_id: number;
  product_name: string;
  size: string;
  price: number;
  quantity: number;
}

export interface OrderResponse {
  id: number;
  order_number: string;
  user_id: number;
  address_id: number;
  total_amount: number;
  shipping_cost: number;
  status: string;
  created_at: Date;
  items?: OrderItemResponse[];
}

export interface UpdateShippingDTO {
  courier: string;
  tracking_number: string;
  shipping_status: string;
}

export interface CalculateShippingDTO {
  destination_city?: string;
  weight?: number;
  courier?: string;
}

export interface ShippingResponse {
  order_id: number;
  courier: string | null;
  tracking_number: string | null;
  shipping_status: string;
  shipped_at?: Date | string | null;
  delivered_at?: Date | string | null;
}

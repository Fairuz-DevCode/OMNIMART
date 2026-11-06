export interface CreatePaymentDTO {
  order_id: number;
  payment_type: string;
}

export interface PaymentResponse {
  id: number;
  order_id: number;
  payment_type: string;
  transaction_status: string;
  payment_url: string;
  created_at: Date;
}

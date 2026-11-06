import API from '../../../shared/services/api';
import { Product } from '../../../types';

export const adminCreateProduct = async (formData: FormData): Promise<Product> => {
  const res = await API.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.payload;
};

export const adminUpdateProduct = async (id: number | string, formData: FormData): Promise<Product> => {
  const res = await API.patch(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.payload;
};

export const adminDeleteProduct = async (id: number | string): Promise<void> => {
  await API.delete(`/products/${id}`);
};

export const adminUpdateShipping = async (
  orderId: number | string,
  payload: { courier: string; tracking_number: string; shipping_status: string }
) => {
  const res = await API.patch(`/shippings/order/${orderId}`, payload);
  return res.data.data;
};

export const calculateShippingCost = async (payload: { address_id: number | string; courier: string }) => {
  const res = await API.post('/shippings/calculate', payload);
  return res.data.data;
};

export const getShippingDetail = async (orderId: number | string) => {
  const res = await API.get(`/shippings/order/${orderId}`);
  return res.data.data;
};

export const confirmOrderReceived = async (orderId: number | string) => {
  const res = await API.patch(`/shippings/order/${orderId}/complete`);
  return res.data.data;
};

export const adminGetOrders = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => {
  const res = await API.get('/orders/admin', { params });
  return res.data.data;
};

export const adminUpdateOrderStatus = async (orderId: number | string, status: string) => {
  const res = await API.patch(`/orders/${orderId}/status`, { status });
  return res.data.data;
};

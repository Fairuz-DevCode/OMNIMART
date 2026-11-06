import API from '../../../shared/services/api';
import { Address, Order } from '../../../types';

export const getAddresses = async (): Promise<Address[]> => {
  const res = await API.get('/addresses');
  return res.data.payload;
};

export const createAddress = async (payload: Omit<Address, 'id' | 'user_id'>): Promise<Address> => {
  const res = await API.post('/addresses', payload);
  return res.data.payload;
};

export const calculateShippingCost = async (payload: { address_id: number | string; courier: string }) => {
  const res = await API.post('/shippings/calculate', payload);
  return res.data.data;
};

export const createOrder = async (payload: { address_id: number | string; shipping_cost: number }): Promise<Order> => {
  const res = await API.post('/orders', payload);
  return res.data.data;
};

export const createPayment = async (payload: { order_id: number | string; payment_type: string }) => {
  const res = await API.post('/payments', payload);
  return res.data.data;
};

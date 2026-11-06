import API from '../../../shared/services/api';
import { Address, Order, User } from '../../../types';

export const getUserProfile = async (): Promise<User> => {
  const res = await API.get('/users/me');
  return res.data.payload;
};

export const updateUserProfile = async (payload: { name?: string; phone?: string }): Promise<User> => {
  const res = await API.patch('/users/me', payload);
  return res.data.payload;
};

export const changePassword = async (payload: { oldPassword?: string; newPassword?: string }) => {
  const res = await API.put('/users/me/change-password', payload);
  return res.data;
};

export const getAddresses = async (): Promise<Address[]> => {
  const res = await API.get('/addresses');
  return res.data.payload;
};

export const createAddress = async (payload: Omit<Address, 'id' | 'user_id'>): Promise<Address> => {
  const res = await API.post('/addresses', payload);
  return res.data.payload;
};

export const deleteAddress = async (id: number | string) => {
  await API.delete(`/addresses/${id}`);
};

export const getOrderHistory = async (): Promise<Order[]> => {
  const res = await API.get('/orders');
  return res.data.data;
};

export const getOrderDetail = async (orderId: number | string): Promise<Order> => {
  const res = await API.get(`/orders/${orderId}`);
  return res.data.data;
};

export const cancelOrder = async (orderId: number | string) => {
  const res = await API.patch(`/orders/${orderId}/cancel`);
  return res.data.data;
};

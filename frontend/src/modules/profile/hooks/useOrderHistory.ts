import { useState, useEffect } from 'react';
import { Order } from '../../../types';
import { getOrderHistory, cancelOrder, getOrderDetail } from '../services/profileApi';

export const useOrderHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    getOrderHistory()
      .then((data) => {
        setOrders(data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancel = async (orderId: number | string) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return;
    try {
      await cancelOrder(orderId);
      fetchOrders();
      if (isDetailOpen) setIsDetailOpen(false);
    } catch (err: any) {
      alert('Gagal membatalkan pesanan: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewDetail = async (orderId: number | string) => {
    try {
      const detail = await getOrderDetail(orderId);
      setSelectedOrder(detail);
      setIsDetailOpen(true);
    } catch (err: any) {
      alert('Gagal memuat detail pesanan: ' + (err.response?.data?.message || err.message));
    }
  };

  return {
    orders,
    loading,
    selectedOrder,
    isDetailOpen,
    setIsDetailOpen,
    handleCancel,
    handleViewDetail,
  };
};

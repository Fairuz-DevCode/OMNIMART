import { useState, useEffect, useCallback } from 'react';
import { adminGetOrders, adminUpdateShipping, adminUpdateOrderStatus } from '../services/adminApi';

export const useManageOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedOrderFilter, setSelectedOrderFilter] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');

  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [shippingForm, setShippingForm] = useState({
    courier: 'JNE',
    tracking_number: '',
    shipping_status: 'SHIPPED',
  });
  const [statusForm, setStatusForm] = useState('pending');
  const [submitting, setSubmitting] = useState(false);

  const mapFilterToStatus = (filter: string) => {
    switch (filter) {
      case 'Pending':
        return 'pending';
      case 'Paid':
        return 'paid';
      case 'Shipped':
        return 'shipped';
      case 'Completed':
        return 'completed';
      case 'Cancel':
        return 'cancel';
      default:
        return undefined;
    }
  };

  const loadOrders = useCallback(() => {
    setLoading(true);
    const status = mapFilterToStatus(selectedOrderFilter);
    adminGetOrders({ status, search: searchTerm })
      .then((data) => {
        if (data && data.orders) {
          setOrders(data.orders);
          setTotalOrders(data.total);
        } else {
          setOrders([]);
          setTotalOrders(0);
        }
      })
      .catch((err) => {
        console.error('Failed to load admin orders:', err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [selectedOrderFilter, searchTerm]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOpenShippingModal = (order: any) => {
    setSelectedOrder(order);
    setShippingForm({
      courier: order.courier_name || 'JNE Regular',
      tracking_number: order.tracking_number || '',
      shipping_status: (order.shipping_status || 'SHIPPED').toUpperCase(),
    });
    setIsShippingModalOpen(true);
  };

  const handleOpenStatusModal = (order: any) => {
    setSelectedOrder(order);
    setStatusForm(order.status || 'pending');
    setIsStatusModalOpen(true);
  };

  const handleUpdateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setSubmitting(true);
      await adminUpdateShipping(selectedOrder.id, {
        courier: shippingForm.courier,
        tracking_number: shippingForm.tracking_number,
        shipping_status: shippingForm.shipping_status.toLowerCase(),
      });
      setIsShippingModalOpen(false);
      loadOrders();
    } catch (err: any) {
      alert('Gagal memperbarui resi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setSubmitting(true);
      await adminUpdateOrderStatus(selectedOrder.id, statusForm);
      setIsStatusModalOpen(false);
      loadOrders();
    } catch (err: any) {
      alert('Gagal memperbarui status order: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    orders,
    totalOrders,
    loading,
    selectedOrderFilter,
    setSelectedOrderFilter,
    searchTerm,
    setSearchTerm,
    isShippingModalOpen,
    setIsShippingModalOpen,
    isStatusModalOpen,
    setIsStatusModalOpen,
    selectedOrder,
    shippingForm,
    setShippingForm,
    statusForm,
    setStatusForm,
    submitting,
    handleOpenShippingModal,
    handleOpenStatusModal,
    handleUpdateShipping,
    handleUpdateStatus,
    loadOrders,
  };
};

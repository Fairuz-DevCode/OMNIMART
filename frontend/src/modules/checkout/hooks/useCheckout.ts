import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../cart';
import { Address, Order } from '../../../types';
import {
  getAddresses,
  createAddress,
  calculateShippingCost,
  createOrder,
  createPayment,
} from '../services/checkoutApi';

export const useCheckout = () => {
  const navigate = useNavigate();
  const { cartData, clearCart, cartLoading } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Modal State for new address
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({
    label: '',
    phone: '',
    street_address: '',
    city: '',
    country: 'Indonesia',
    postal_code: '',
  });

  // Shipping & Payment
  const [shippingCost, setShippingCost] = useState(25000);
  const [courier, setCourier] = useState('JNE Regular');
  const [paymentType, setPaymentType] = useState('bank_transfer');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Success modal state
  const [orderSuccessData, setOrderSuccessData] = useState<{ order: Order; payment: any } | null>(null);

  const items = cartData?.items || [];
  const totalHargaProduk = cartData?.total_price || 0;
  const totalGrand = totalHargaProduk + shippingCost;

  useEffect(() => {
    let isMounted = true;
    setLoadingAddresses(true);
    getAddresses()
      .then((data) => {
        if (isMounted && data) {
          setAddresses(data);
          if (data.length > 0 && data[0].id) setSelectedAddressId(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingAddresses(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedAddressId) {
      calculateShippingCost({ address_id: selectedAddressId, courier })
        .then((res) => {
          if (res?.cost) setShippingCost(Number(res.cost));
        })
        .catch(() => {
          setShippingCost(25000);
        });
    }
  }, [selectedAddressId, courier]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createAddress(newAddrForm);
      const updated = await getAddresses();
      setAddresses(updated);
      if (created?.id) setSelectedAddressId(created.id);
      setIsModalOpen(false);
      setNewAddrForm({
        label: '',
        phone: '',
        street_address: '',
        city: '',
        country: 'Indonesia',
        postal_code: '',
      });
    } catch (err: any) {
      alert('Gagal menambah alamat: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      alert('Silakan pilih atau tambahkan alamat pengiriman terlebih dahulu.');
      return;
    }

    try {
      setSubmittingOrder(true);
      const order = await createOrder({
        address_id: selectedAddressId,
        shipping_cost: shippingCost,
      });

      let paymentRes = null;
      if (order?.id) {
        try {
          paymentRes = await createPayment({
            order_id: order.id,
            payment_type: paymentType,
          });
        } catch {
          // Fallback if payment record fails
        }
      }

      clearCart();
      setOrderSuccessData({ order, payment: paymentRes });
    } catch (err: any) {
      alert('Gagal membuat order: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingOrder(false);
    }
  };

  return {
    navigate,
    cartLoading,
    loadingAddresses,
    items,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    isModalOpen,
    setIsModalOpen,
    newAddrForm,
    setNewAddrForm,
    courier,
    setCourier,
    paymentType,
    setPaymentType,
    shippingCost,
    submittingOrder,
    totalHargaProduk,
    totalGrand,
    orderSuccessData,
    handleAddAddress,
    handlePlaceOrder,
  };
};

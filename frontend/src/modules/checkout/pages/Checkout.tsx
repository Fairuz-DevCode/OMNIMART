import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import { useCheckout } from '../hooks/useCheckout';
import AddressSelector from '../components/AddressSelector';
import AddAddressModal from '../components/AddAddressModal';
import ShippingMethod from '../components/ShippingMethod';
import PaymentMethod from '../components/PaymentMethod';
import OrderSummary from '../components/OrderSummary';

export const Checkout: React.FC = () => {
  const {
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
  } = useCheckout();

  if (cartLoading || loadingAddresses) {
    return <LoadingSpinner text="Memuat halaman checkout..." />;
  }

  if (items.length === 0 && !orderSuccessData) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-body">
      <h1 className="text-2xl font-extrabold font-headline text-gray-900 mb-6">
        Checkout & Pembayaran
      </h1>

      {orderSuccessData ? (
        /* SUCCESS ORDER SCREEN */
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-md text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold font-headline text-gray-900 mb-2">
            Pesanan Berhasil Dibuat!
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Nomor Pesanan: <strong className="text-gray-900">#{orderSuccessData.order?.id}</strong>
          </p>

          <div className="bg-gray-50 p-4 rounded-xl text-left text-xs space-y-2 mb-6 font-label">
            <div className="flex justify-between">
              <span className="text-gray-500">Status Order:</span>
              <span className="font-bold text-amber-600 uppercase">
                {orderSuccessData.order?.status || 'PENDING'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Metode Pembayaran:</span>
              <span className="font-bold text-gray-800 uppercase">
                {paymentType.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Pembayaran:</span>
              <span className="font-bold text-emerald-600 text-sm">
                Rp {totalGrand.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/orders')}
            className="w-full py-3 rounded-xl bg-black text-white font-label font-bold text-sm hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Lihat Status Pesanan Saya
          </button>
        </div>
      ) : (
        /* CHECKOUT FORM */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <AddressSelector
              addresses={addresses}
              selectedAddressId={selectedAddressId}
              onSelectAddress={setSelectedAddressId}
              onOpenAddModal={() => setIsModalOpen(true)}
            />
            <ShippingMethod courier={courier} setCourier={setCourier} />
            <PaymentMethod paymentType={paymentType} setPaymentType={setPaymentType} />
          </div>

          <OrderSummary
            items={items}
            totalHargaProduk={totalHargaProduk}
            shippingCost={shippingCost}
            totalGrand={totalGrand}
            submittingOrder={submittingOrder}
            onPlaceOrder={handlePlaceOrder}
          />
        </div>
      )}

      <AddAddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        form={newAddrForm}
        setForm={setNewAddrForm}
        onSubmit={handleAddAddress}
      />
    </div>
  );
};

export default Checkout;

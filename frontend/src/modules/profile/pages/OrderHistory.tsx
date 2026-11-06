import React from 'react';
import { Package, Clock, CheckCircle2, XCircle, Truck, RefreshCw, Eye } from 'lucide-react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import EmptyState from '../../../shared/components/EmptyState';
import Modal from '../../../shared/components/Modal';
import { getImageUrl } from '../../../shared/utils/imageUrl';
import { useOrderHistory } from '../hooks/useOrderHistory';

export const OrderHistory: React.FC = () => {
  const {
    orders,
    loading,
    selectedOrder,
    isDetailOpen,
    setIsDetailOpen,
    handleCancel,
    handleViewDetail,
  } = useOrderHistory();

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-label font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" /> Menunggu Pembayaran
          </span>
        );
      case 'PAID':
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-label font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Diproses
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-label font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
            <Truck className="w-3.5 h-3.5" /> Dikirim
          </span>
        );
      case 'COMPLETED':
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-label font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-label font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5" /> Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-label font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
            {s}
          </span>
        );
    }
  };

  if (loading) return <LoadingSpinner text="Memuat riwayat pesanan..." />;

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <EmptyState
          icon={Package}
          title="Belum Ada Pesanan"
          description="Kamu belum pernah membuat pesanan di StreetWear."
          actionLabel="Mulai Belanja Now"
          actionLink="/"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-body">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold font-headline text-gray-900">
          Riwayat Pesanan ({orders.length})
        </h1>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const items = (order as any).OrderItems || order.items || [];
          const totalHarga = Number((order as any).total_amount || order.total_price || 0);
          const dateStr = new Date((order as any).createdAt || Date.now()).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });

          return (
            <div
              key={order.id}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-label font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                    #{order.id}
                  </span>
                  <span className="text-xs text-gray-500 font-label">{dateStr}</span>
                </div>
                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Items Preview */}
              <div className="space-y-3 mb-4">
                {items.slice(0, 2).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                      <img
                        src={getImageUrl(item.img_url || item.product_img_url || item.Product?.img_url || item)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                        {item.product_name || item.Product?.name || 'Produk'}
                      </h4>
                      <p className="text-xs text-gray-500 font-label">
                        {item.quantity} x Rp {Number(item.price_at_purchase || item.price || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))}
                {items.length > 2 && (
                  <p className="text-xs text-gray-500 font-label italic">
                    +{items.length - 2} produk lainnya
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-3 gap-3">
                <div>
                  <span className="text-xs text-gray-500 block">Total Pesanan</span>
                  <span className="text-base font-black font-headline text-emerald-600">
                    Rp {totalHarga.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewDetail(order.id)}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-label font-bold text-gray-800 hover:border-black flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detail
                  </button>

                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="px-3.5 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-label font-bold transition-colors cursor-pointer"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detail Order */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Detail Pesanan #${selectedOrder?.id}`}>
        {selectedOrder && (
          <div className="space-y-4 font-body text-xs">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
              <div>
                <span className="text-gray-500 block">Status</span>
                <span className="font-bold text-gray-900 uppercase">{selectedOrder.status}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Tanggal</span>
                <span className="font-bold text-gray-900">
                  {new Date((selectedOrder as any).createdAt || Date.now()).toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-2 font-headline">Daftar Produk</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {((selectedOrder as any).OrderItems || selectedOrder.items || []).map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-bold text-gray-900">{item.Product?.name || item.product_name}</p>
                      <p className="text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-gray-900">
                      Rp {(Number(item.price_at_purchase || item.price || 0) * item.quantity).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(selectedOrder as any).Address && (
              <div>
                <h4 className="font-bold text-gray-900 mb-1 font-headline">Alamat Pengiriman</h4>
                <p className="text-gray-700">
                  {(selectedOrder as any).Address.street_address}, {(selectedOrder as any).Address.city},{' '}
                  {(selectedOrder as any).Address.postal_code} (Telp: {(selectedOrder as any).Address.phone})
                </p>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between items-center text-sm font-bold">
              <span>Total Akhir</span>
              <span className="text-emerald-600 font-headline text-base">
                Rp {Number((selectedOrder as any).total_amount || selectedOrder.total_price || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderHistory;

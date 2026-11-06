import React from 'react';
import { ShoppingBag, Truck, Edit3, Search, Clock, CheckCircle2, XCircle } from 'lucide-react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import Modal from '../../../shared/components/Modal';
import { useManageOrders } from '../hooks/useManageOrders';

export const ManageOrders: React.FC = () => {
  const {
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
  } = useManageOrders();

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Menunggu Bayar
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Sudah Dibayar
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
            <Truck className="w-3 h-3" /> Dikirim
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Selesai
          </span>
        );
      case 'cancel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> Dibatalkan
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/90 shadow-xl shadow-gray-200/40 mb-8 font-body">
      {/* Header & Status Filter Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-black" />
            <h2 className="text-xl font-extrabold font-headline text-gray-900">
              Manajemen Pesanan & Logistik ({totalOrders})
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-label mt-1">
            Pantau semua transaksi pelanggan, verifikasi status pembayaran, dan perbarui nomor resi pengiriman.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-64">
          <input
            type="text"
            placeholder="Cari order, pelanggan, resi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-black outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {['Semua', 'Pending', 'Paid', 'Shipped', 'Completed', 'Cancel'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedOrderFilter(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold font-label transition-all cursor-pointer ${
              selectedOrderFilter === tab
                ? 'bg-black text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'Semua' ? 'Semua Pesanan' : tab}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {loading ? (
        <LoadingSpinner text="Memuat daftar pesanan..." />
      ) : orders.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="font-bold text-sm">Tidak ada pesanan ditemukan</p>
          <p className="text-xs text-gray-400">Coba ubah filter atau kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs font-body border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 font-label font-bold border-b border-gray-200">
                <th className="py-3.5 px-4">NO. ORDER & TANGGAL</th>
                <th className="py-3.5 px-4">PELANGGAN & TUJUAN</th>
                <th className="py-3.5 px-4">ITEM PRODUK</th>
                <th className="py-3.5 px-4">PENGIRIMAN & RESI</th>
                <th className="py-3.5 px-4">STATUS ORDER</th>
                <th className="py-3.5 px-4">TOTAL BIAYA</th>
                <th className="py-3.5 px-4 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.map((order) => {
                const dateStr = order.created_at
                  ? new Date(order.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-';
                const buyerName = order.customer_name || 'Pelanggan';
                const buyerEmail = order.customer_email || '';
                const location = order.city || order.street_address || 'Indonesia';
                const itemsList = Array.isArray(order.items) ? order.items : [];
                const firstItem = itemsList[0];
                const itemSummary = firstItem
                  ? `${firstItem.quantity}x ${firstItem.product_name} (${firstItem.size})`
                  : 'Pesanan Produk';
                const otherItemsCount = itemsList.length > 1 ? ` +${itemsList.length - 1} item lainnya` : '';
                const amount = `Rp ${Number(order.total_amount || 0).toLocaleString('id-ID')}`;

                return (
                  <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-gray-900 font-mono">
                        {order.order_number || `#${order.id}`}
                      </span>
                      <p className="text-[11px] text-gray-400">{dateStr}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <h4 className="font-bold text-gray-900">{buyerName}</h4>
                      <p className="text-[11px] text-gray-500">{location}</p>
                      {buyerEmail && <p className="text-[10px] text-gray-400">{buyerEmail}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-800">{itemSummary}</p>
                      {otherItemsCount && (
                        <span className="text-[10px] text-gray-500 font-medium">{otherItemsCount}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-800">{order.courier_name || 'JNE Regular'}</p>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {order.tracking_number ? `Resi: ${order.tracking_number}` : 'Belum ada resi'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>
                    <td className="py-3.5 px-4 font-black text-gray-900">{amount}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenShippingModal(order)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-label bg-black text-white hover:bg-gray-800 transition-all flex items-center gap-1 cursor-pointer"
                          title="Input atau perbarui resi kurir"
                        >
                          <Truck size={13} />
                          <span>Resi</span>
                        </button>
                        <button
                          onClick={() => handleOpenStatusModal(order)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-label bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all flex items-center gap-1 cursor-pointer"
                          title="Ubah status pesanan"
                        >
                          <Edit3 size={13} />
                          <span>Status</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Update Resi */}
      <Modal
        isOpen={isShippingModalOpen}
        onClose={() => setIsShippingModalOpen(false)}
        title={`Update Resi Pengiriman - ${selectedOrder?.order_number || selectedOrder?.id}`}
      >
        <form onSubmit={handleUpdateShipping} className="space-y-4 font-body">
          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Kurir Pengiriman</label>
            <input
              type="text"
              required
              placeholder="JNE / J&T / Sicepat / SiCepat / Pos Indonesia"
              value={shippingForm.courier}
              onChange={(e) => setShippingForm({ ...shippingForm, courier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Nomor Resi (Tracking Number)</label>
            <input
              type="text"
              required
              placeholder="e.g. JNE1234567890"
              value={shippingForm.tracking_number}
              onChange={(e) => setShippingForm({ ...shippingForm, tracking_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Status Pengiriman</label>
            <select
              value={shippingForm.shipping_status}
              onChange={(e) => setShippingForm({ ...shippingForm, shipping_status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none bg-white font-label"
            >
              <option value="PROCESSING">PROCESSING (Sedang Diproses)</option>
              <option value="SHIPPED">SHIPPED (Dalam Pengiriman)</option>
              <option value="DELIVERED">DELIVERED (Telah Diterima)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-black text-white font-label font-bold rounded-xl text-sm hover:bg-gray-800 transition-colors mt-2 cursor-pointer"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Update Resi'}
          </button>
        </form>
      </Modal>

      {/* Modal Ubah Status Order */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`Ubah Status Pesanan - ${selectedOrder?.order_number || selectedOrder?.id}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 font-body">
          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Pilih Status Baru</label>
            <select
              value={statusForm}
              onChange={(e) => setStatusForm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none bg-white font-label"
            >
              <option value="pending">pending (Menunggu Pembayaran)</option>
              <option value="paid">paid (Pembayaran Diterima / Terverifikasi)</option>
              <option value="shipped">shipped (Sedang Dikirim)</option>
              <option value="completed">completed (Pesanan Selesai)</option>
              <option value="cancel">cancel (Batalkan Pesanan & Kembalikan Stok)</option>
            </select>
          </div>

          <p className="text-[11px] text-gray-500">
            *Catatan: Mengubah status ke <strong>cancel</strong> akan secara otomatis mengembalikan kuantitas stok varian produk ke katalog.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-black text-white font-label font-bold rounded-xl text-sm hover:bg-gray-800 transition-colors mt-2 cursor-pointer"
          >
            {submitting ? 'Memperbarui...' : 'Perbarui Status Pesanan'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ManageOrders;

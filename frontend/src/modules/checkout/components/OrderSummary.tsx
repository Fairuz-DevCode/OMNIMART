import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { CartItem } from '../../../types';
import { getImageUrl } from '../../../shared/utils/imageUrl';

interface OrderSummaryProps {
  items: CartItem[];
  totalHargaProduk: number;
  shippingCost: number;
  totalGrand: number;
  submittingOrder: boolean;
  onPlaceOrder: () => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  totalHargaProduk,
  shippingCost,
  totalGrand,
  submittingOrder,
  onPlaceOrder,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit space-y-4">
      <h2 className="text-base font-bold font-headline text-gray-900 border-b border-gray-100 pb-3">
        Ringkasan Pesanan
      </h2>

      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 text-xs">
            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
              <img
                src={getImageUrl((item as any).product_img_url || item.Product?.image_url || item.product?.image_url || item)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 line-clamp-1">
                {(item as any).product_name || item.Product?.name || item.product?.name || 'Produk'}
              </p>
              <p className="text-gray-500">Qty: {item.quantity}</p>
            </div>
            <span className="font-bold text-gray-900">
              Rp {(Number((item as any).price_at_addition || item.Product?.price || item.product?.price || 0) * item.quantity).toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-2 text-xs font-body">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal Produk</span>
          <span className="font-semibold text-gray-900">Rp {totalHargaProduk.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Biaya Pengiriman</span>
          <span className="font-semibold text-gray-900">Rp {shippingCost.toLocaleString('id-ID')}</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm font-bold">
          <span className="text-gray-900">Total Tagihan</span>
          <span className="text-lg font-black text-emerald-600 font-headline">
            Rp {totalGrand.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      <button
        disabled={submittingOrder}
        onClick={onPlaceOrder}
        className="w-full py-3 px-4 rounded-xl bg-black text-white font-label font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 disabled:bg-gray-400 transition-all shadow-md cursor-pointer"
      >
        {submittingOrder ? 'Memproses Pesanan...' : 'Buat Pesanan Sekarang'} <ArrowRight className="w-4 h-4" />
      </button>

      <div className="flex items-center justify-center gap-1 text-[11px] text-gray-500 pt-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Transaksi 100% Aman & Terenkripsi</span>
      </div>
    </div>
  );
};

export default OrderSummary;

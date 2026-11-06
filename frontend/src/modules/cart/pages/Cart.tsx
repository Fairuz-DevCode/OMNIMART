import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../../../shared/utils/imageUrl';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import EmptyState from '../../../shared/components/EmptyState';

export const Cart: React.FC = () => {
  const { cartData, cartLoading, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  const items = cartData?.items || [];
  const totalHarga = cartData?.total_price || 0;

  if (cartLoading) {
    return <LoadingSpinner text="Memuat keranjang belanja..." />;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <EmptyState
          icon={ShoppingBag}
          title="Keranjang Belanja Kosong"
          description="Kamu belum menambahkan produk apa pun ke keranjang belanja."
          actionLabel="Jelajahi Produk"
          actionLink="/"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-body">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-gray-900" />
          <h1 className="text-2xl font-extrabold font-headline text-gray-900">
            Keranjang Belanja ({items.length} Item)
          </h1>
        </div>
        <Link
          to="/"
          className="text-xs font-label font-semibold text-gray-600 hover:text-black flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Lanjut Belanja
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Item List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item: any) => {
            const product = item.Product || item.product;
            const variantSize = item.size || item.ProductVariant?.size;
            const image = getImageUrl(item.product_img_url || product?.img_url || product?.image_url || item);
            const price = Number(item.price || item.price_at_addition || product?.price || 0);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all"
              >
                {/* Image */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                  <img src={image} alt={item.product_name || product?.name} className="w-full h-full object-cover" />
                </div>

                {/* Details */}
                <div className="flex-1 px-4">
                  <h3 className="text-sm font-bold font-headline text-gray-900 line-clamp-1">
                    {item.product_name || product?.name || 'Produk'}
                  </h3>
                  {variantSize && (
                    <span className="inline-block text-xs font-label text-gray-500 mt-0.5">
                      Ukuran: <strong className="text-gray-800">{variantSize}</strong>
                    </span>
                  )}
                  <p className="text-sm font-extrabold text-desert_sand-600 mt-1">
                    Rp {price.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="p-1.5 hover:bg-gray-200 rounded-l-xl text-gray-700 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold font-label px-3 min-w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1.5 hover:bg-gray-200 rounded-r-xl text-gray-700 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Hapus item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Sidebar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit">
          <h2 className="text-lg font-bold font-headline text-gray-900 border-b border-gray-100 pb-3 mb-4">
            Ringkasan Belanja
          </h2>

          <div className="space-y-3 text-sm font-body mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">
                Rp {totalHarga.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Estimasi Ongkir</span>
              <span className="text-xs text-gray-400">Dihitung di checkout</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center font-bold text-base">
              <span className="text-gray-900">Total Harga</span>
              <span className="text-xl font-black text-desert_sand-600 font-headline">
                Rp {totalHarga.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full py-3 px-4 rounded-xl bg-black text-white font-label font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-98 transition-all shadow-md cursor-pointer"
          >
            Lanjut ke Checkout <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;

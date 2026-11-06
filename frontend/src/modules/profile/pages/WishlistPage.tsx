import React, { useState, useEffect } from 'react';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../../shared/services/api';
import { useToast } from '../../../shared/components/Toast';
import { getImageUrl } from '../../../shared/utils/imageUrl';
import { ProductCardSkeleton } from '../../../shared/components/SkeletonLoader';

interface WishlistItem {
  id: number;
  product_id: number;
  name: string;
  slug: string;
  price: number;
  img_url: string;
  category_name?: string;
}

export const WishlistPage: React.FC = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await api.get('/wishlist');
      setItems(res.data?.data || []);
    } catch {
      toast.error('Gagal memuat daftar wishlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId: number) => {
    try {
      await api.post('/wishlist/toggle', { productId });
      setItems((prev) => prev.filter((item) => item.product_id !== productId));
      toast.success('Dihapus dari Wishlist');
    } catch {
      toast.error('Gagal menghapus produk');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-header text-gray-900">Wishlist Saya</h1>
          <p className="text-xs text-gray-500 mt-1">Produk-produk yang Anda sukai dan simpan.</p>
        </div>
        <span className="text-xs font-bold font-label bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
          {items.length} Barang
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">Wishlist Anda Kosong</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
            Jelajahi koleksi sneakers dan footwear kami lalu tandai produk favorit Anda.
          </p>
          <Link
            to="/product"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-xs font-bold font-label hover:bg-gray-800 transition-all"
          >
            Mulai Belanja <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all relative"
            >
              <button
                onClick={() => handleRemove(item.product_id)}
                className="absolute top-6 right-6 p-2 bg-white/90 backdrop-blur-md rounded-full text-rose-500 shadow-sm hover:scale-110 transition-transform cursor-pointer z-10"
                title="Hapus dari Wishlist"
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              </button>

              <Link to={`/product/${item.slug || item.product_id}`} className="block">
                <div className="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3">
                  <img
                    src={getImageUrl(item.img_url)}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                {item.category_name && (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    {item.category_name}
                  </span>
                )}
                <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-black">
                  {item.name}
                </h4>
                <p className="text-xs font-bold text-gray-900 mt-2">
                  Rp {Number(item.price).toLocaleString('id-ID')}
                </p>
              </Link>

              <Link
                to={`/product/${item.slug || item.product_id}`}
                className="mt-4 w-full py-2.5 rounded-xl bg-gray-50 hover:bg-black hover:text-white text-gray-800 text-xs font-bold font-label flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Lihat Detail
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

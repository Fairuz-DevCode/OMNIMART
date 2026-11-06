import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Truck,
  RefreshCw,
  Star,
  Clock,
  Heart,
  ChevronRight
} from 'lucide-react';
import { getProductById, getBySlugPath } from '../../catalog';
import { useCart } from '../../cart';
import { getImageUrl } from '../../../shared/utils/imageUrl';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import { ReviewSection } from '../components/ReviewSection';
import { useToast } from '../../../shared/components/Toast';
import { api } from '../../../shared/services/api';
import { useAuth } from '../../auth';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (!id) return;

    const fetchDetail = /^\d+$/.test(id) ? getProductById(id) : getBySlugPath(id);

    fetchDetail
      .then((res) => {
        if (isMounted && res) {
          const data = res.product || res;
          setProduct(data);
          const primaryImg = getImageUrl(data.img_url || data.image_url || data);
          setSelectedImage(primaryImg);

          const fallbackGallery = [
            primaryImg,
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80',
          ];
          setGalleryImages(fallbackGallery);

          const variants = data.variants || data.Variants || [];
          if (variants.length > 0) {
            setSelectedVariant(variants[0]);
          }
        }
      })
      .catch((err) => {
        if (isMounted) setErrorMsg('Gagal memuat detail produk. ' + (err.response?.data?.message || ''));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id]);

  const toggleWishlist = async () => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu untuk menyimpan ke Wishlist');
      return;
    }
    try {
      const res = await api.post('/wishlist/toggle', { productId: product.id });
      setIsFavorite(res.data.data.inWishlist);
      toast.success(res.data.message);
    } catch {
      toast.error('Gagal memperbarui Wishlist');
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await addToCart(product.id, selectedVariant?.id, quantity);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3000);
    } catch (err: any) {
      alert('Gagal menambah ke keranjang: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    try {
      await addToCart(product.id, selectedVariant?.id, quantity);
      navigate('/cart');
    } catch (err: any) {
      alert('Gagal memproses pembelian: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <LoadingSpinner text="Memuat detail produk..." />;
  if (errorMsg || !product) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center font-body">
        <p className="text-red-600 mb-4">{errorMsg || 'Produk tidak ditemukan.'}</p>
        <button
          onClick={() => navigate('/product')}
          className="px-5 py-2.5 bg-black text-white rounded-full text-xs font-bold font-label cursor-pointer"
        >
          Kembali ke Katalog
        </button>
      </div>
    );
  }

  const displayPrice = Number(product.price || 899000).toLocaleString('id-ID');
  const variants = product.variants || product.Variants || [
    { id: 1, size: '36', stock: 10 },
    { id: 2, size: '37', stock: 15 },
    { id: 3, size: '38', stock: 8 },
    { id: 4, size: '39', stock: 12 },
    { id: 5, size: '40', stock: 5 },
    { id: 6, size: '41', stock: 9 },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white text-gray-800 font-body py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-label text-gray-500 mb-6">
          <Link to="/" className="hover:text-black">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/product" className="hover:text-black">Catalog</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-bold text-gray-900 truncate max-w-xs">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm">
          {/* Left: Gallery Images */}
          <div className="space-y-4">
            <div className="relative w-full h-96 sm:h-[450px] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={toggleWishlist}
                className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-md rounded-full shadow-md hover:scale-110 transition-transform cursor-pointer"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-full h-24 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImage === img ? 'border-black scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Info & Buy Section */}
          <div className="flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold font-label bg-emerald-50 text-emerald-700 border border-emerald-100">
                {product.brand || 'Streetwear Series'}
              </span>

              <h1 className="text-2xl sm:text-3xl font-black font-headline text-gray-900 mt-3 mb-2">
                {product.name}
              </h1>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold font-label text-gray-700">4.9 (128 ulasan)</span>
              </div>

              <div className="text-3xl font-black font-headline text-emerald-600 mb-6">
                Rp {displayPrice}
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                {product.description ||
                  'Sepatu sneakers dengan desain modern aerodinamis untuk kenyamanan aktivitas harian. Dibuat dengan bahan berkualitas tinggi dan sol yang empuk.'}
              </p>

              {/* Size Variants */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold font-label text-gray-900 uppercase tracking-wider">
                    Pilih Ukuran
                  </span>
                  <span className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer">Panduan Ukuran</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v: any) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold font-label transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white shadow-md scale-105'
                            : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        EU {v.size}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              {addedSuccess && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Berhasil ditambahkan ke keranjang!
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-black text-black font-bold font-label text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" /> Tambah Keranjang
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-black text-white font-bold font-label text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-md cursor-pointer"
                >
                  Beli Sekarang
                </button>
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-3 gap-2 pt-4 text-center">
                <div className="p-3 rounded-xl bg-gray-50 flex flex-col items-center gap-1">
                  <ShieldCheck className="w-5 h-5 text-gray-700" />
                  <span className="text-[10px] font-bold text-gray-600">100% Original</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 flex flex-col items-center gap-1">
                  <Truck className="w-5 h-5 text-gray-700" />
                  <span className="text-[10px] font-bold text-gray-600">Bebas Ongkir</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 flex flex-col items-center gap-1">
                  <RefreshCw className="w-5 h-5 text-gray-700" />
                  <span className="text-[10px] font-bold text-gray-600">Retur 30 Hari</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Reviews */}
        <ReviewSection productId={product.id} />
      </div>
    </div>
  );
};

export default ProductDetail;

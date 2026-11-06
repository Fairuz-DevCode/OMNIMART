import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Maximize2, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../../cart';
import { getImageUrl } from '../../../shared/utils/imageUrl';
import { Product } from '../../../types';

interface ProductCardProps {
  product: Product;
  dealEndsAt?: Date;
}

/* ──────────────────────────────────────────────────────────
  Countdown hook
────────────────────────────────────────────────────────── */
function useCountdown(target?: Date) {
  const calc = () => {
    if (!target) return null;
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { d, h, m, s };
  };

  const [time, setTime] = useState(calc);
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

/* ──────────────────────────────────────────────────────────
  Helper: two-digit pad
────────────────────────────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, '0');

/* ──────────────────────────────────────────────────────────
  ProductCard
────────────────────────────────────────────────────────── */
export const ProductCard: React.FC<ProductCardProps> = ({ product, dealEndsAt }) => {
  const { addToCart } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const countdown = useCountdown(dealEndsAt);

  /* price */
  const price = product.price ? Number(product.price) : 0;
  const displayPrice = price.toLocaleString('id-ID');

  /* original price: 2× current (mock) – replace with real field if available */
  const originalPrice = ((product as any).original_price ?? price * 2).toLocaleString('id-ID');

  /* discount percent */
  const discountPct =
    (product as any).discount ??
    (price > 0 ? Math.round((1 - price / ((product as any).original_price ?? price * 2)) * 100) : 0);

  /* image */
  const primaryImage = getImageUrl(
    product.img_url || (product as any).image_url || product.image || product
  );

  /* rating */
  const rating: number = (product as any).rating ?? 4.8;

  /* route */
  const productPath = (product as any).slug
    ? `/product/${(product as any).Category?.slug ? `${(product as any).Category.slug}/` : ''}${(product as any).slug}`
    : `/product/${product.id}`;

  const handleAddCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const variants = (product as any).variants || (product as any).Variants || [];
    addToCart(product.id, variants[0]?.id, 1);
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite((f) => !f);
  };

  return (
    <div className="group relative flex flex-col w-full font-body select-none">
      {/* ── IMAGE AREA ── */}
      <div className="relative rounded-2xl bg-[#f0f0ee] overflow-hidden">
        {/* Discount badge */}
        {discountPct > 0 && (
          <span className="absolute top-3 left-3 z-10 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            {discountPct}% Off
          </span>
        )}

        {/* Action buttons – right column */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {/* Wishlist */}
          <button
            onClick={toggleFavorite}
            className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
            title="Wishlist"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-400'
              }`}
            />
          </button>

          {/* Expand / Quick View */}
          <Link
            to={productPath}
            className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
            title="Lihat Detail"
          >
            <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
          </Link>

          {/* Add to cart */}
          <button
            onClick={handleAddCart}
            className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
            title="Tambah ke Keranjang"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {/* Product Image */}
        <Link to={productPath} className="block">
          <img
            src={primaryImage}
            alt={product.name}
            onError={(e: any) => {
              e.target.onerror = null;
              e.target.src =
                'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80';
            }}
            className="w-full h-56 sm:h-64 object-cover rounded-3xl p-4 group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Countdown timer (only when dealEndsAt is provided) */}
        {countdown && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#c8a84b] rounded-b-2xl px-3 py-2.5 flex items-center justify-center gap-2">
            {[
              { val: countdown.d, label: 'Days' },
              { val: countdown.h, label: 'Hours' },
              { val: countdown.m, label: 'Mins' },
              { val: countdown.s, label: 'Sec' },
            ].map((unit, i) => (
              <React.Fragment key={unit.label}>
                {i > 0 && <span className="text-white/60 font-bold text-lg leading-none -mt-2">:</span>}
                <div className="flex flex-col items-center min-w-8.5">
                  <span className="text-white font-black text-lg leading-none tabular-nums">
                    {pad(unit.val)}
                  </span>
                  <span className="text-white/70 text-[9px] font-semibold mt-0.5 tracking-wide">
                    {unit.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* ── INFO AREA ── */}
      <div className="mt-3 px-0.5">
        {/* Brand + Rating row */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-gray-500 font-medium">
            {product.brand || (product as any).Brand?.name || 'NEXA'}
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-700">{rating}</span>
          </div>
        </div>

        {/* Product name */}
        <Link to={productPath}>
          <h3 className="text-sm font-extrabold font-headline text-gray-900 line-clamp-1 hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price row */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-base font-black text-gray-900">Rp {displayPrice}</span>
          <span className="text-sm text-gray-400 line-through font-medium">Rp {originalPrice}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

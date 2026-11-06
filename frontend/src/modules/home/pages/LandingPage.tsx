import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, RotateCcw, Headset, LockKeyhole, ArrowRight } from 'lucide-react';

import CategorySection from '../components/CategorySection';
import FeatureGrid from '../components/FeatureGrid';
import PromoBanner from '../components/PromoBanner';
import ProductCard from '../../catalog/components/ProductCard';
import { getTopProducts } from '../../catalog/services/catalogApi';
import { mockProducts } from '../../catalog/constants/catalogOptions';

import heroShoeImg from '../../../assets/img/hero-image.png';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  // Ambil top products berdasarkan rating & penjualan dari backend API
  useEffect(() => {
    let isMounted = true;
    getTopProducts(4)
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setTopProducts(data);
        } else if (isMounted) {
          setTopProducts(mockProducts.slice(0, 4));
        }
      })
      .catch(() => {
        if (isMounted) {
          setTopProducts(mockProducts.slice(0, 4));
        }
      })
      .finally(() => {
        if (isMounted) setLoadingTop(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Deal countdown — ends 2 days + 12 h from now (re-calculates each page load)
  const dealEndsAt = React.useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 60); // 60 hours from now
    return d;
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-body px-6 pt-4 ">
      
      {/* 1. HERO BANNER SECTION (Clean White Theme matching Reference 1) */}
      <section className="relative w-full bg-linear-to-b from-blue-50/40 via-white to-white py-2 lg:py-10 overflow-hidden border-b border-gray-100">
        <div className="max-w-6xl mx-auto sm:px-6 lg:px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-headline text-gray-900 tracking-tight leading-tight">
                Step Into <br />
                <span className="text-blue-600">Comfort & Style</span>
              </h1>

              <p className="text-sm sm:text-base text-gray-500 font-body max-w-lg leading-relaxed">
                Discover our latest collection of shoes, crafted to combine everyday comfort, high performance, and modern fashion.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => navigate('/product')}
                  className="px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigate('/product')}
                  className="px-8 py-3.5 rounded-full bg-white hover:bg-gray-50 text-gray-800 font-extrabold text-sm border border-gray-200 shadow-xs transition-all cursor-pointer"
                >
                  Explore More
                </button>
              </div>
            </div>

            {/* Right Hero Image Showcase with Discount Callout */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <div className="relative w-full max-w-lg h-110 sm:h-110 flex items-center justify-center">
                {/* Background soft glow circle */}
                <div className="absolute w-80 h-72 sm:w-96 sm:h-96 rounded-full bg-blue-100/50 filter blur-xl -z-10" />

                {/* Main Hero Shoe Image */}
                <img
                  src={heroShoeImg}
                  alt="Step Into Comfort & Style Shoe"
                  className="w-full h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROPOSITIONAL SERVICES BAR (1 Row Single Line) */}
      <section className="w-full bg-gray-50/70 border-b border-gray-300 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-gray-700">
            <div className="flex items-center gap-3  md:justify-start">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Truck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-extrabold text-gray-900 font-headline">Free Delivery</h4>
                <p className="text-[11px] text-gray-400 font-label">On orders over $75</p>
              </div>
            </div>

            <div className="flex items-center gap-3  md:justify-start">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-extrabold text-gray-900 font-headline">Easy Returns</h4>
                <p className="text-[11px] text-gray-400 font-label">30-days return policy</p>
              </div>
            </div>

            <div className="flex items-center gap-3  md:justify-start">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <LockKeyhole className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-extrabold text-gray-900 font-headline">Secure Checkout</h4>
                <p className="text-[11px] text-gray-400 font-label">100% secure payments</p>
              </div>
            </div>

            <div className="flex items-center gap-3  md:justify-start">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Headset className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-extrabold text-gray-900 font-headline">24/7 Support</h4>
                <p className="text-[11px] text-gray-400 font-label">We're here to help</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN SECTIONS CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
        
        {/* 3. KATEGORI PILIHAN (1 Baris Single Row) */}
        <section>
          <CategorySection />
        </section>

        {/* 4. TOP PRODUCTS / PRODUK TERLARIS (1 Baris Single Row) */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-headline tracking-tight text-gray-900">
                Top Products
              </h2>
              <p className="text-xs text-gray-400 font-label mt-0.5">
                Produk paling laris dengan ulasan terbaik minggu ini
              </p>
            </div>
            <button
              onClick={() => navigate('/product')}
              className="text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua Produk</span>
              <span>→</span>
            </button>
          </div>

          {/* 1 Baris Grid 4 Kartu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topProducts.map((p: any, idx: number) => (
              <ProductCard
                key={p.id}
                product={p}
                dealEndsAt={idx === 0 ? dealEndsAt : undefined}
              />
            ))}
          </div>
        </section>

        {/* 5. FEATURED COLLECTIONS (1 Baris Single Row) */}
        <section>
          <FeatureGrid />
        </section>

        {/* 6. PROMO BANNER (1 Baris Single Row) */}
        <section>
          <PromoBanner />
        </section>

      </div>

      {/* 7. BRAND LOGOS SECTION */}
      <section className="w-full bg-gray-50/80 py-12 border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-70 grayscale hover:grayscale-0 transition-all">
          <span className="font-black italic text-3xl tracking-tighter text-gray-800">NIKE</span>
          <span className="font-bold text-2xl lowercase tracking-tight text-gray-800">adidas</span>
          <span className="font-black text-3xl uppercase tracking-tighter text-gray-800">PUMA</span>
          <div className="flex flex-col items-center leading-none text-gray-800">
            <span className="font-black text-2xl italic tracking-tighter">NB</span>
            <span className="text-[10px] font-bold tracking-widest mt-1">new balance</span>
          </div>
          <span className="font-black text-2xl uppercase tracking-widest text-gray-800">CONVERSE</span>
          <div className="flex flex-col items-center leading-none text-gray-800">
            <span className="font-black text-3xl uppercase">VANS</span>
            <span className="text-[8px] font-bold tracking-widest mt-1">"OFF THE WALL"</span>
          </div>
          <span className="font-black italic text-3xl lowercase tracking-tighter text-blue-600">asics</span>
          <span className="font-black text-2xl uppercase tracking-tighter text-gray-800">Reebok</span>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;

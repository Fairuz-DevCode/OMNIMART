import React from 'react';
import { useNavigate } from 'react-router-dom';
import PromoImg from '../../../assets/img/promo.png';

export const PromoBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex flex-row items-center justify-between w-full min-h-64 rounded-3xl bg-cover bg-center bg-no-repeat overflow-hidden border border-gray-100 shadow-sm"
      style={{ backgroundImage: `url(${PromoImg})` }}
    >
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-linear-to-r from-white/95 via-white/80 to-transparent" />

      <div className="relative z-10 flex flex-col items-start justify-center w-full sm:w-2/3 max-w-lg p-6 sm:p-10 text-left">
        <span className="font-extrabold text-xs text-blue-600 tracking-widest uppercase font-label">
          SPECIAL OFFER
        </span>
        <h3 className="mt-1 mb-2 font-black text-2xl sm:text-3xl text-gray-900 leading-tight font-headline">
          Summer Essentials
        </h3>
        <p className="mb-5 font-medium text-xs sm:text-sm text-gray-600 leading-relaxed font-body">
          Dapatkan diskon eksklusif hingga 30% untuk koleksi produk pilihan minggu ini.
        </p>
        <button
          onClick={() => navigate('/product')}
          className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          Shop Sale Now
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;

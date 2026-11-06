import React from 'react';
import { Truck } from 'lucide-react';

interface ShippingMethodProps {
  courier: string;
  setCourier: (courier: string) => void;
}

export const ShippingMethod: React.FC<ShippingMethodProps> = ({ courier, setCourier }) => {
  const options = [
    'JNE Regular (Rp 25.000)',
    'J&T Express (Rp 28.000)',
    'Sicepat Best (Rp 30.000)',
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
        <Truck className="w-5 h-5 text-gray-900" />
        <h2 className="text-base font-bold font-headline text-gray-900">
          2. Metode Pengiriman
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = courier.startsWith(opt.split(' ')[0]);
          return (
            <button
              key={opt}
              onClick={() => setCourier(opt)}
              className={`p-3 rounded-xl border text-left text-xs font-label transition-all cursor-pointer ${
                isSelected ? 'border-black bg-gray-50 font-bold' : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ShippingMethod;

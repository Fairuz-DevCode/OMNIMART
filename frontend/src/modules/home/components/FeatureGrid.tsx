import React from 'react';
import { useNavigate } from 'react-router-dom';
import featureRunning from '../../../assets/img/feature-running.jpg';
import featureLifestyle from '../../../assets/img/feature-lifestyle.jpg';
import featureTraining from '../../../assets/img/feature-training.jpg';
import featureBasket from '../../../assets/img/feature-basket.jpg';

const FEATURED = [
  {
    id: 1,
    title: 'Running',
    subtitle: 'Built for speed',
    image: featureRunning,
  },
  {
    id: 2,
    title: 'Lifestyle',
    subtitle: 'Made for everyday',
    image: featureLifestyle,
  },
  {
    id: 3,
    title: 'Training',
    subtitle: 'Push your limits',
    image: featureTraining,
  },
  {
    id: 4,
    title: 'Basketball',
    subtitle: 'Own the game',
    image: featureBasket,
  },
];

export const FeatureGrid: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-headline tracking-tight text-gray-900">
            Featured Collections
          </h2>
          <p className="text-xs text-gray-400 font-label mt-0.5">
            Koleksi gaya pilihan dengan performa tinggi & desain eksklusif
          </p>
        </div>
      </div>

      {/* Single Row 1 Baris Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {FEATURED.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate('/product')}
            className="relative rounded-3xl overflow-hidden h-72 sm:h-80 group cursor-pointer shadow-sm border border-gray-100"
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
              <span className="text-[10px] font-extrabold uppercase font-label tracking-wider text-blue-400 mb-0.5">
                COLLECTION
              </span>
              <h3 className="font-extrabold text-white text-base md:text-lg leading-tight font-headline">
                {item.title}
              </h3>
              <p className="text-xs text-gray-300 font-label mt-0.5">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureGrid;

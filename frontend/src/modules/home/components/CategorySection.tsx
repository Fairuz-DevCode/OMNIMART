import React from 'react';
import { useNavigate } from 'react-router-dom';
import categorySneakers from '../../../assets/img/categories-sneakers.jpg';
import categoryFormal from '../../../assets/img/category-formal.png';
import categoryBoots from '../../../assets/img/category-boots.png';
import categoryHeels from '../../../assets/img/category-heels.png'
import categoryAtletic from '../../../assets/img/category-athletic.png'

const categories = [
  {
    id: 1,
    name: 'Sneakers & Kasual',
    image: categorySneakers,
    slug: 'sneakers-kasual',
  },
  {
    id: 2,
    name: 'Formal & Dress Shoes',
    image: categoryFormal,
    slug: 'formal-dress-shoes',
  },
  {
    id: 3,
    name: 'Boots',
    image: categoryBoots,
    slug: 'boots',
  },
  {
    id: 4,
    name: 'Heels & Flats',
    image: categoryHeels,
    slug: 'heels-flats',
  },
    {
    id: 5,
    name: 'Athletic',
    image: categoryAtletic,
    slug: 'athletic',
  },
];

export const CategorySection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-headline tracking-tight text-gray-900">
            Kategori Pilihan
          </h2>
          <p className="text-xs text-gray-400 font-label mt-0.5">
            Pilihan kategori favorit untuk gaya kasual & olahraga
          </p>
        </div>
        <button
          onClick={() => navigate('/product')}
          className="text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Lihat Semua</span>
          <span>→</span>
        </button>
      </div>

      {/* Single Row 1 Baris Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => navigate(`/product?category=${encodeURIComponent(cat.slug)}`)}
            className="p-3.5 rounded-3xl bg-white border border-gray-100 hover:border-blue-500 cursor-pointer transition-all duration-300 text-center group flex flex-col items-center shadow-xs hover:shadow-lg hover:-translate-y-1"
          >
            <div className="w-full h-35 lg:h-50 mb-3 rounded-2xl overflow-hidden flex items-center justify-center bg-white">
              <img
                src={cat.image}
                alt={cat.name}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h3 className="text-xs font-extrabold text-gray-900 font-headline group-hover:text-blue-600 transition-colors">
              {cat.name}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategorySection;

import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse flex flex-col justify-between">
      <div>
        <div className="w-full aspect-square bg-gray-200 rounded-xl mb-4" />
        <div className="h-3 w-1/3 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
      </div>
      <div>
        <div className="h-5 w-1/2 bg-gray-200 rounded mb-4" />
        <div className="h-10 w-full bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
};

export const CatalogSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

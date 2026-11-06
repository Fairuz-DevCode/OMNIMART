import React from 'react';
import { SlidersHorizontal, Search, RotateCcw, Check, ChevronDown, X } from 'lucide-react';
import { useProductCatalog } from '../hooks/useProductCatalog';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import { CatalogSkeleton } from '../../../shared/components/SkeletonLoader';

export const ProductCatalog: React.FC = () => {
  const {
    products,
    loading,
    isMobileFilterOpen,
    setIsMobileFilterOpen,
    activeFilterCount,
    filters,
    options,
    handlers,
  } = useProductCatalog();

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 via-emerald-50/20 to-white text-gray-800 font-body pb-20 pt-4">
      {/* Top Banner Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/60 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-gray-900">
              Streetwear Catalog
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-label mt-1">
              Menampilkan <span className="font-bold text-emerald-700">{products.length}</span> produk pilihan terbaik
            </p>
          </div>

          {/* Search bar & Filter Trigger for Mobile */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari sepatu, brand..."
                value={filters.searchQuery}
                onChange={(e) => handlers.setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white rounded-full border border-gray-200 text-xs focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => handlers.setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-xs font-bold font-label shadow-sm cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter ({activeFilterCount})</span>
            </button>
          </div>
        </div>

        {/* Top Category Horizontal Scroll Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
          {options.topCategories.map((cat) => {
            const active = filters.selectedTopCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handlers.setSelectedTopCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold font-label whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Sidebar Filter for Desktop */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-6 bg-white p-6 rounded-3xl border border-gray-200/60 shadow-xs h-fit sticky top-20">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="font-extrabold text-sm font-headline tracking-wider text-gray-900 uppercase">
                Filter ({activeFilterCount})
              </h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={handlers.resetFilters}
                  className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            {/* Gender Filter */}
            <div>
              <h3 className="text-xs font-bold font-label text-gray-900 mb-2">Gender</h3>
              <div className="space-y-1.5">
                {options.genders.map((g) => {
                  const checked = filters.selectedGenders.includes(g);
                  return (
                    <label
                      key={g}
                      onClick={() => handlers.toggleGender(g)}
                      className="flex items-center justify-between text-xs text-gray-600 hover:text-black cursor-pointer py-1"
                    >
                      <span>{g}</span>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          checked
                            ? 'bg-black border-black text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Brand Filter */}
            <div>
              <h3 className="text-xs font-bold font-label text-gray-900 mb-2">Brand</h3>
              <div className="space-y-1.5">
                {options.brandsList.map((b) => {
                  const checked = filters.selectedBrands.includes(b);
                  return (
                    <label
                      key={b}
                      onClick={() => handlers.toggleBrand(b)}
                      className="flex items-center justify-between text-xs text-gray-600 hover:text-black cursor-pointer py-1"
                    >
                      <span>{b}</span>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          checked
                            ? 'bg-black border-black text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <h3 className="text-xs font-bold font-label text-gray-900 mb-2">Harga</h3>
              <div className="space-y-1.5">
                {options.priceRanges.map((r) => {
                  const checked = filters.selectedPriceRange === r.label;
                  return (
                    <label
                      key={r.label}
                      onClick={() =>
                        handlers.setSelectedPriceRange(checked ? '' : r.label)
                      }
                      className="flex items-center justify-between text-xs text-gray-600 hover:text-black cursor-pointer py-1"
                    >
                      <span>{r.label}</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          checked
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Color Filter */}
            <div>
              <h3 className="text-xs font-bold font-label text-gray-900 mb-2">Warna</h3>
              <div className="flex flex-wrap gap-2">
                {options.colorsList.map((c) => {
                  const selected = filters.selectedColors.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      onClick={() => handlers.toggleColor(c.name)}
                      style={{ background: c.gradient || c.hex }}
                      title={c.name}
                      className={`w-6 h-6 rounded-full relative transition-all cursor-pointer ${
                        c.border ? 'border border-gray-300' : ''
                      } ${selected ? 'ring-2 ring-black ring-offset-2 scale-110' : 'hover:scale-105'}`}
                    >
                      {selected && (
                        <Check
                          className={`w-3 h-3 absolute inset-0 m-auto ${
                            c.name === 'White' || c.name === 'Yellow'
                              ? 'text-black'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="flex-1">
            {loading ? (
              <CatalogSkeleton count={6} />
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xs">
                <p className="text-base font-bold font-headline text-gray-700">
                  Tidak ada produk yang cocok dengan filter kamu.
                </p>
                <button
                  onClick={handlers.resetFilters}
                  className="mt-4 px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold font-label shadow-sm hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;

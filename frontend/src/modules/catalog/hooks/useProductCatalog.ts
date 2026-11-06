import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../services/catalogApi';
import { mockProducts, topCategories, genders, brandsList, priceRanges, colorsList, materialsList, solesList } from '../constants/catalogOptions';
import { Product } from '../../../types';

export const useProductCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Filter States
  const [selectedTopCategory, setSelectedTopCategory] = useState('All Product');
  const [selectedGenders, setSelectedGenders] = useState<string[]>(
    categoryParam === 'man' ? ['Man'] : categoryParam === 'girl' ? ['Woman'] : categoryParam === 'kids' ? ['Children'] : []
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    categoryParam === 'brand' ? ['Nike'] : []
  );
  const [selectedPriceRange, setSelectedPriceRange] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedSoles, setSelectedSoles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch product list
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getProducts(1, 50)
      .then((data) => {
        if (isMounted) {
          const list = data?.products || data || [];
          setApiProducts(list.length > 0 ? list : mockProducts);
        }
      })
      .catch(() => {
        if (isMounted) setApiProducts(mockProducts as any);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const toggleGender = (gender: string) => {
    setSelectedGenders((prev) =>
      prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    );
  };

  const toggleMaterial = (mat: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
    );
  };

  const toggleSole = (sole: string) => {
    setSelectedSoles((prev) =>
      prev.includes(sole) ? prev.filter((s) => s !== sole) : [...prev, sole]
    );
  };

  const resetFilters = () => {
    setSelectedTopCategory('All Product');
    setSelectedGenders([]);
    setSelectedBrands([]);
    setSelectedPriceRange('');
    setSelectedColors([]);
    setSelectedMaterials([]);
    setSelectedSoles([]);
    setSearchQuery('');
    setSearchParams({});
  };

  const toggleFavorite = (productId: string | number) => {
    setFavorites((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  // Filtering products logic
  const filteredProducts = useMemo(() => {
    const listToFilter = apiProducts.length > 0 ? apiProducts : (mockProducts as any);

    return listToFilter.filter((product: any) => {
      // Top Category
      if (selectedTopCategory !== 'All Product') {
        const prodCat = (product.category || product.Category?.name || '').toLowerCase();
        if (!prodCat.includes(selectedTopCategory.toLowerCase())) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = product.name?.toLowerCase().includes(q);
        const brandMatch = (product.brand || product.Brand?.name || '').toLowerCase().includes(q);
        if (!nameMatch && !brandMatch) return false;
      }

      // Gender
      if (selectedGenders.length > 0) {
        const pGender = product.gender || 'Man';
        if (!selectedGenders.includes(pGender)) return false;
      }

      // Brand
      if (selectedBrands.length > 0) {
        const pBrand = product.brand || product.Brand?.name || 'Nike';
        if (!selectedBrands.includes(pBrand)) return false;
      }

      // Price Range
      if (selectedPriceRange) {
        const range = priceRanges.find((r) => r.label === selectedPriceRange);
        if (range) {
          const price = product.price || 0;
          if (range.min !== undefined && price < range.min) return false;
          if (range.max !== undefined && price > range.max) return false;
        }
      }

      // Color
      if (selectedColors.length > 0) {
        const pColor = product.color || 'White';
        if (!selectedColors.includes(pColor)) return false;
      }

      // Material
      if (selectedMaterials.length > 0) {
        const pMat = product.material || 'Real Skin';
        if (!selectedMaterials.includes(pMat)) return false;
      }

      // Sole
      if (selectedSoles.length > 0) {
        const pSole = product.sole || 'Rubber Sole';
        if (!selectedSoles.includes(pSole)) return false;
      }

      return true;
    });
  }, [
    apiProducts,
    selectedTopCategory,
    searchQuery,
    selectedGenders,
    selectedBrands,
    selectedPriceRange,
    selectedColors,
    selectedMaterials,
    selectedSoles,
  ]);

  const activeFilterCount =
    (selectedTopCategory !== 'All Product' ? 1 : 0) +
    selectedGenders.length +
    selectedBrands.length +
    (selectedPriceRange ? 1 : 0) +
    selectedColors.length +
    selectedMaterials.length +
    selectedSoles.length +
    (searchQuery ? 1 : 0);

  return {
    products: filteredProducts,
    loading,
    isMobileFilterOpen,
    setIsMobileFilterOpen,
    favorites,
    activeFilterCount,
    filters: {
      selectedTopCategory,
      selectedGenders,
      selectedBrands,
      selectedPriceRange,
      selectedColors,
      selectedMaterials,
      selectedSoles,
      searchQuery,
    },
    options: {
      topCategories,
      genders,
      brandsList,
      priceRanges,
      colorsList,
      materialsList,
      solesList,
    },
    handlers: {
      setSelectedTopCategory,
      toggleGender,
      toggleBrand,
      setSelectedPriceRange,
      toggleColor,
      toggleMaterial,
      toggleSole,
      setSearchQuery,
      resetFilters,
      toggleFavorite,
    },
  };
};

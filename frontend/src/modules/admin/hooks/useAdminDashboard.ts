import { useState, useEffect } from 'react';
import { getProducts } from '../../catalog/services/catalogApi';
import API from '../../../shared/services/api';

export const useAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getProducts(1, 100).catch(() => ({ products: [], totalItems: 0 })),
      API.get('/categories').then(res => res.data.payload).catch(() => []),
    ])
      .then(([prodRes, catRes]) => {
        if (isMounted) {
          const prods = prodRes?.products || prodRes || [];
          const cats = catRes?.categories || catRes?.payload || catRes || [];
          setStats({
            totalProducts: prods.length || prodRes?.totalItems || 0,
            totalCategories: cats.length || 0,
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    stats,
    loading,
  };
};

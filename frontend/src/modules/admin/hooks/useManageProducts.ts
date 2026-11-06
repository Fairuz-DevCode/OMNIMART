import { useState, useEffect } from 'react';
import { Product, Category } from '../../../types';
import { getProductById, getProducts } from '../../catalog/services/catalogApi';
import { adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from '../services/adminApi';
import API from '../../../shared/services/api';

export const useManageProduct = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    price: '',
    gender: 'man',
    sku: '',
    slug: '',
    description: '',
    img_url: '',
    variants: [{ size: '40', stock: 10 }],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [productRes, categoriesRes] = await Promise.all([
        getProducts(1, 100).catch(() => ({ products: [] })),
        API.get('/categories').then(res => res.data.payload).catch(() => ({ categories: [] })),
      ]);

      setProducts(productRes?.products || []);
      setCategories(categoriesRes?.categories || categoriesRes || []);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const generateSKU = (formState: typeof form) => {
    const brandOrName = (formState.name || 'PRD').substring(0, 3).toUpperCase();
    const genderCode = formState.gender === 'woman' ? 'W' : formState.gender === 'man' ? 'M' : 'U';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${brandOrName}-${genderCode}-${randomNum}`;
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setSelectedFile(null);
    setIsModalOpen(true);
    setForm({
      category_id: '',
      name: '',
      price: '',
      gender: 'man',
      sku: '',
      slug: '',
      description: '',
      img_url: '',
      variants: [{ size: '40', stock: 10 }],
    });
  };

  const handleOpenEdit = async (product: Product) => {
    setEditingId(product.id);
    setSelectedFile(null);
    setIsModalOpen(true);

    try {
      const fullProduct = await getProductById(product.id);
      const data = fullProduct || product;

      setForm({
        category_id: String(data.category_id || (data as any).Category?.id || ''),
        name: data.name || '',
        price: String(data.price || ''),
        gender: data.gender || 'man',
        sku: (data as any).sku || '',
        slug: (data as any).slug || '',
        description: data.description || '',
        img_url: data.image_url || data.image || '',
        variants:
          (data as any).variants && (data as any).variants.length > 0
            ? (data as any).variants.map((v: any) => ({
                id: v.id,
                size: v.size,
                stock: v.stock,
              }))
            : [{ size: '40', stock: 10 }],
      });
    } catch (error) {
      console.error('Gagal mengambil detail produk:', error);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('Hapus produk ini secara permanen?')) return;
    try {
      await adminDeleteProduct(id);
      loadData();
    } catch {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const handleVariantChange = (idx: number, field: string, value: any) => {
    const updated = [...form.variants];
    (updated[idx] as any)[field] = value;
    setForm({ ...form, variants: updated });
  };

  const addVariantRow = () =>
    setForm({
      ...form,
      variants: [...form.variants, { size: '42', stock: 10 }],
    });

  const removeVariantRow = (idx: number) =>
    setForm({
      ...form,
      variants: form.variants.filter((_, i) => i !== idx),
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const formData = new FormData();

      formData.append('category_id', form.category_id);
      formData.append('name', form.name);
      formData.append('price', form.price);
      formData.append('gender', form.gender || 'man');
      const finalSku = form.sku.trim() !== '' ? form.sku : generateSKU(form);
      formData.append('sku', finalSku);
      const slugName = form.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      formData.append('slug', slugName);
      formData.append('description', form.description);
      if (selectedFile) formData.append('img_url', selectedFile);
      formData.append('variants', JSON.stringify(form.variants));

      if (editingId) await adminUpdateProduct(editingId, formData);
      else await adminCreateProduct(formData);

      setIsModalOpen(false);
      loadData();
    } catch {
      alert('Gagal menyimpan produk');
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts =
    products?.filter((p) => {
      const nameMatch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((p as any).sku && (p as any).sku.toLowerCase().includes(searchQuery.toLowerCase()));
      if (selectedCategoryFilter === 'Semua') return nameMatch;
      return (
        nameMatch &&
        (p.category === selectedCategoryFilter ||
          (p as any).Category?.name === selectedCategoryFilter)
      );
    }) || [];

  return {
    loading,
    categories,
    products,
    filteredProducts,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    setIsModalOpen,
    editingId,
    submitting,
    form,
    setForm,
    setSelectedFile,
    handleOpenAdd,
    handleOpenEdit,
    handleDelete,
    handleSubmit,
    handleVariantChange,
    addVariantRow,
    removeVariantRow,
  };
};

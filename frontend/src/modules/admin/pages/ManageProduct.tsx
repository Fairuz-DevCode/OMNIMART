import React from 'react';
import { Plus, Trash2, Edit3, Package, Search } from 'lucide-react';
import { getImageUrl } from '../../../shared/utils/imageUrl';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import Modal from '../../../shared/components/Modal';
import { useManageProduct } from '../hooks/useManageProducts';

export const ManageProduct: React.FC = () => {
  const {
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
  } = useManageProduct();

  if (loading) return <LoadingSpinner text="Memuat daftar produk..." />;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/90 shadow-xl shadow-gray-200/40 mb-8 font-body">
      {/* Header & Category Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-black" />
            <h2 className="text-xl font-extrabold font-headline text-gray-900">
              Manajemen Produk & Matriks Stok Vault
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-label mt-1">
            Katalog konfirmasi rasio, harga alas floor price, dan alokasi gudang pusat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['Semua', 'Sneakers & Kasual', 'Formal & Oxford', 'Boots & Tactical', 'Heels & Flats'].map(
            (cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategoryFilter(cat.split(' ')[0])}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-label transition-all cursor-pointer ${
                  selectedCategoryFilter === cat.split(' ')[0]
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            )
          )}

          <button
            onClick={handleOpenAdd}
            className="ml-2 px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white rounded-full text-xs font-bold font-label flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />Tambah Produk
          </button>
        </div>
      </div>

      {/* Search Bar & Filter Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Cari nama model, SKU, atau barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-body focus:bg-white focus:border-black outline-none transition-colors"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="text-xs font-label text-gray-500 flex items-center gap-2">
          <span>Menampilkan {filteredProducts.length} dari {products.length} Item</span>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full text-left text-xs font-body border-collapse">
          <thead>
            <tr className="bg-gray-50/80 text-gray-500 font-label font-bold border-b border-gray-200">
              <th className="py-3.5 px-4">PRODUK & DETAIL</th>
              <th className="py-3.5 px-4">KATEGORI</th>
              <th className="py-3.5 px-4">SKU / BARCODE</th>
              <th className="py-3.5 px-4">HARGA BELI</th>
              <th className="py-3.5 px-4">HARGA JUAL</th>
              <th className="py-3.5 px-4">STOK LEVEL</th>
              <th className="py-3.5 px-4">PUBLIKASI</th>
              <th className="py-3.5 px-4 text-center">AKSI CEPAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400 font-label">
                  Tidak ada produk ditemukan.
                </td>
              </tr>
            ) : (
              filteredProducts.map((prod) => {
                const image = getImageUrl((prod as any).img_url || prod.image_url || prod.image);
                const categoryName = prod.category || (prod as any).Category?.name || 'Sneakers';
                const skuCode = (prod as any).sku || `SKU-${prod.id}-STX`;
                const costPrice = (prod as any).costPrice || `Rp ${Number((prod.price || 1000000) * 0.8).toLocaleString('id-ID')}`;
                const sellPrice = (prod as any).sellPrice || `Rp ${Number(prod.price || 1500000).toLocaleString('id-ID')}`;
                const stockStatus = (prod as any).stockStatus || 'Ready';

                return (
                  <tr key={prod.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={image}
                          alt={prod.name}
                          className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-gray-900 line-clamp-1">{prod.name}</h4>
                          <p className="text-[11px] text-gray-400 line-clamp-1">{(prod as any).details || prod.description || 'Size Range: EU 40-44'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-700">
                        {categoryName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-600">{skuCode}</td>
                    <td className="py-3.5 px-4 text-gray-500 font-bold">{costPrice}</td>
                    <td className="py-3.5 px-4 text-black font-extrabold">{sellPrice}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          stockStatus.includes('Ready')
                            ? 'bg-emerald-100 text-emerald-800'
                            : stockStatus.includes('Low')
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {stockStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        • {(prod as any).status || 'active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Produk"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prod.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form Product */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Produk' : 'Tambah Produk Baru'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Nama Produk</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-label font-bold text-gray-700 mb-1">Harga (Rp)</label>
              <input
                type="number"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-label font-bold text-gray-700 mb-1">Kategori</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none bg-white font-label"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-label font-bold text-gray-700 mb-1">Gender</label>
              <select
                value={form.gender || 'man'}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none bg-white font-label"
              >
                <option value="man">Man</option>
                <option value="woman">Woman</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-label font-bold text-gray-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                placeholder="Auto-generated"
                value={form.sku || ''}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Upload File Gambar (JPEG/PNG/WebP)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs font-label file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200 border border-gray-300 rounded-xl p-1"
            />
          </div>

          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Deskripsi</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
            />
          </div>

          {/* Variants */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-label font-bold text-gray-700">Varian Ukuran & Stok</label>
              <button
                type="button"
                onClick={addVariantRow}
                className="text-[11px] font-label text-blue-600 font-bold hover:underline cursor-pointer"
              >
                + Tambah Ukuran
              </button>
            </div>
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Size (e.g. 42)"
                    value={v.size}
                    onChange={(e) => handleVariantChange(i, 'size', e.target.value)}
                    className="w-1/2 px-3 py-1.5 border border-gray-300 rounded-xl text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Stok"
                    value={v.stock}
                    onChange={(e) => handleVariantChange(i, 'stock', Number(e.target.value))}
                    className="w-1/2 px-3 py-1.5 border border-gray-300 rounded-xl text-xs"
                  />
                  {form.variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariantRow(i)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-black text-white font-label font-bold rounded-xl text-sm hover:bg-gray-800 transition-colors mt-2 cursor-pointer"
          >
            {submitting ? 'Menyimpan...' : editingId ? 'Update Produk' : 'Simpan Produk'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ManageProduct;

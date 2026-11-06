export const topCategories = [
  'All Product',
  'Limited Edition',
  'Sneakers',
  'Boots',
  'Slippers',
  'Formal Shoes',
  'Sport shoes',
  'Slip-Ons',
  'Casual Shoes',
  'Loafers Shoes',
  'Running Shoes',
  'Basket Shoes',
];

export const genders = ['Man', 'Woman', 'Children'];

export const brandsList = ['Nike', 'Adidas', 'Reebook', 'Hoka', 'Converse', 'Nineten'];

export const priceRanges = [
  { label: 'Under Rp 500rb', max: 500000 },
  { label: 'Rp 500rb - Rp 1.5jt', min: 500000, max: 1500000 },
  { label: 'Rp 1.5jt - Rp 3jt', min: 1500000, max: 3000000 },
  { label: 'Over Rp 3jt', min: 3000000 },
];

export const colorsList = [
  { name: 'Black', hex: '#000000', border: false },
  { name: 'Yellow', hex: '#FACC15', border: false },
  { name: 'Red', hex: '#EF4444', border: false },
  { name: 'Purple', hex: '#A855F7', border: false },
  { name: 'Blue', hex: '#3B82F6', border: false },
  { name: 'White', hex: '#FFFFFF', border: true },
  { name: 'Green', hex: '#22C55E', border: false },
  { name: 'Multicolor', gradient: 'linear-gradient(135deg, #ff0000, #00ff00, #0000ff)', border: false },
];

export const materialsList = ['Real Skin', 'Canvas', 'Synthetic Skin', 'Mesh'];

export const solesList = ['Rubber Sole', 'EVA Sole'];

export const mockProducts = [
  {
    id: 'm1',
    name: 'Nike Air Force 1 07',
    sub: "Men's shoes",
    price: 1650000,
    oldPrice: 1830000,
    rating: 4.9,
    gender: 'Man',
    brand: 'Nike',
    category: 'Sneakers',
    color: 'White',
    material: 'Real Skin',
    sole: 'Rubber Sole',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'm2',
    name: 'Nike Court Low Vintage',
    sub: "Men's shoes",
    price: 1725000,
    oldPrice: 1900000,
    rating: 4.9,
    gender: 'Man',
    brand: 'Nike',
    category: 'Casual Shoes',
    color: 'White',
    material: 'Real Skin',
    sole: 'Rubber Sole',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'm3',
    name: 'Nike Air Max SC SE Maroon',
    sub: "Men's shoes",
    price: 1500000,
    oldPrice: 1680000,
    rating: 4.9,
    gender: 'Man',
    brand: 'Nike',
    category: 'Sport shoes',
    color: 'Red',
    material: 'Mesh',
    sole: 'EVA Sole',
    image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'm4',
    name: 'Nike Air Max 1 Original',
    sub: "Men's shoes",
    price: 1725000,
    oldPrice: 1860000,
    rating: 4.9,
    gender: 'Man',
    brand: 'Nike',
    category: 'Running Shoes',
    color: 'Blue',
    material: 'Mesh',
    sole: 'Rubber Sole',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'm5',
    name: 'Nike Air Max 1 Dusty Rose',
    sub: "Women's shoes",
    price: 1650000,
    oldPrice: 1830000,
    rating: 4.8,
    gender: 'Woman',
    brand: 'Nike',
    category: 'Casual Shoes',
    color: 'Red',
    material: 'Real Skin',
    sole: 'Rubber Sole',
    image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&auto=format&fit=crop&q=80',
  },
];

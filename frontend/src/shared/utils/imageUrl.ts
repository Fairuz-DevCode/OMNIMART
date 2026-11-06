const BACKEND_BASE = 'http://localhost:5000';

export const getImageUrl = (img: any): string => {
  if (!img) return 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&q=80';
  
  if (typeof img === 'string') {
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return `${BACKEND_BASE}${img.startsWith('/') ? img : `/${img}`}`;
  }
  
  const rawUrl = img.img_url || img.image_url || '';
  if (!rawUrl) return 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&q=80';
  
  if (rawUrl.startsWith('http') || rawUrl.startsWith('data:')) return rawUrl;
  return `${BACKEND_BASE}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
};

import React, { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useAuth } from '../../auth';
import { useToast } from '../../../shared/components/Toast';

interface Review {
  id: number;
  product_id: number;
  rating: number;
  comment: string;
  created_at: string;
  user_name: string;
}

interface ReviewSectionProps {
  productId: number;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ productId }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<{ avg_rating: number; total_reviews: number }>({
    avg_rating: 0,
    total_reviews: 0,
  });
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/products/${productId}/reviews`);
      if (res.data?.data) {
        setReviews(res.data.data.reviews || []);
        setStats({
          avg_rating: Number(res.data.data.stats?.avg_rating || 0),
          total_reviews: Number(res.data.data.stats?.total_reviews || 0),
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Silakan login terlebih dahulu untuk memberikan ulasan');
      return;
    }
    if (!comment.trim()) {
      toast.error('Mohon tuliskan ulasan Anda');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/products/${productId}/reviews`, {
        rating,
        comment,
      });
      toast.success('Ulasan berhasil dikirim!');
      setComment('');
      setRating(5);
      fetchReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengirimkan ulasan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold font-header text-gray-900">Ulasan & Penilaian</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center text-amber-500">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              {stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '0.0'}
            </span>
            <span className="text-xs text-gray-500">({stats.total_reviews} ulasan)</span>
          </div>
        </div>
      </div>

      {/* Form Ulasan */}
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8">
        <h4 className="text-sm font-bold text-gray-900 mb-3">Tulis Ulasan Anda</h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Rating Produk</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bagikan pengalaman Anda mengenai kualitas produk ini..."
              className="w-full text-xs p-3.5 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-black transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold font-label hover:bg-gray-800 disabled:opacity-50 transition-all cursor-pointer"
          >
            {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
          </button>
        </form>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs flex flex-col items-center gap-2">
            <MessageSquare className="w-8 h-8 opacity-40" />
            Belum ada ulasan untuk produk ini. Jadilah yang pertama!
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-900">{r.user_name}</span>
                <span className="text-[10px] text-gray-400">
                  {new Date(r.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-3.5 h-3.5 ${
                      idx < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{r.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { reviewApi } from '../../api/review.api';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../lib/stores/auth.store';
import { DoctorReview } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';
import { Star, Loader2, MessageSquare, Pencil, Trash2 } from 'lucide-react';

export const ReviewFeedPage: React.FC = () => {
  const { id: doctorId } = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editOverview, setEditOverview] = useState('');
  const [editRating, setEditRating] = useState(5);
  const { user } = useAuthStore();

  const loadReviews = useCallback(async () => {
    if (!doctorId) return;
    try {
      const data = await reviewApi.getDoctorReviews(Number(doctorId), page, 10);
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  }, [doctorId, page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(v => (
        <button
          key={v}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(v)}
          className={`transition-colors ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star className={`w-4 h-4 ${v <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        </button>
      ))}
    </div>
  );

  const startEdit = (review: DoctorReview) => {
    setEditingId(review.id);
    setEditTitle(review.title || '');
    setEditOverview(review.overview || '');
    setEditRating(review.rating || 5);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await reviewApi.updateReview(editingId, {
        title: editTitle || undefined,
        overview: editOverview || undefined,
        rating: editRating,
      });
      toast.success('Review updated');
      setEditingId(null);
      await loadReviews();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update review'));
    }
  };

  const handleDelete = async (reviewId: number) => {
    if (!confirm('Delete this review?')) return;
    try {
      await reviewApi.deleteReview(reviewId);
      toast.success('Review deleted');
      await loadReviews();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete review'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6 animate-slide-in-up">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Star className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold gradient-text">Reviews</h1>
          <p className="text-sm text-gray-500">{total} review{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No reviews yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 stagger-children">
            {reviews.map((review) => (
              <div key={review.id} className="card p-6 animate-slide-in-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-xs font-bold text-brand-600 ring-1 ring-brand-100">
                      {review.reviewerId.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-sm text-gray-900">User {review.reviewerId.substring(0, 8)}...</span>
                      <span className="text-gray-400 text-xs ml-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {renderStars(review.rating)}
                </div>

                {editingId === review.id ? (
                  <div className="space-y-3 mt-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-2.5 input-focus"
                      placeholder="Title"
                    />
                    <textarea
                      value={editOverview}
                      onChange={(e) => setEditOverview(e.target.value)}
                      className="w-full px-4 py-2.5 input-focus"
                      rows={3}
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">Rating:</span>
                      {renderStars(editRating, true, setEditRating)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="btn-primary px-4 py-2 text-sm">Save</button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {review.title && (
                      <h3 className="font-semibold text-gray-900 mb-1">{review.title}</h3>
                    )}
                    <p className="text-gray-600 text-sm leading-relaxed">{review.overview}</p>
                    {user?.id === review.reviewerId && (
                      <div className="mt-3 flex gap-3">
                        <button onClick={() => startEdit(review)} className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => handleDelete(review.id)} className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

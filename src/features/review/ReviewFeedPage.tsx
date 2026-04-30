import React, { useState, useEffect, useCallback } from 'react';
import { reviewApi } from '../../api/review.api';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../lib/stores/auth.store';
import { DoctorReview } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';

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

  const getStarRating = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

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
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reviews</h1>
      
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reviews yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">User {review.reviewerId.substring(0, 8)}...</span>
                    <span className="text-gray-500 text-sm">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-yellow-400 font-medium">{getStarRating(review.rating)}</span>
                </div>
                
                {editingId === review.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="Title"
                    />
                    <textarea
                      value={editOverview}
                      onChange={(e) => setEditOverview(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      rows={3}
                    />
                    <select
                      value={editRating}
                      onChange={(e) => setEditRating(Number(e.target.value))}
                      className="px-3 py-2 border rounded"
                    >
                      {[1, 2, 3, 4, 5].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 border rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {review.title && (
                      <h3 className="font-medium text-lg mb-2">{review.title}</h3>
                    )}
                    <p className="text-gray-600">{review.overview}</p>
                    {user?.id === review.reviewerId && (
                      <div className="mt-3 flex gap-3">
                        <button onClick={() => startEdit(review)} className="text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(review.id)} className="text-red-600 hover:underline">Delete</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
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

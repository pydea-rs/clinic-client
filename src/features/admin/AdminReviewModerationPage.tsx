import React, { useState, useCallback, useEffect } from 'react';
import { reviewApi } from '../../api/review.api';
import toast from 'react-hot-toast';
import { DoctorReview } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';

export const AdminReviewModerationPage: React.FC = () => {
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const result = await reviewApi.getAllReviews(page, limit);
      setReviews(result.reviews);
      setTotal(result.total);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      await reviewApi.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setTotal(prev => prev - 1);
      toast.success('Review deleted successfully');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete review'));
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Review Moderation</h1>
        <span className="text-sm text-gray-500">{total} total reviews</span>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reviews found</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-500 text-lg">
                        {'★'.repeat(Math.round(review.rating))}{'☆'.repeat(5 - Math.round(review.rating))}
                      </span>
                      <span className="text-sm text-gray-500">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    {review.title && <h3 className="font-bold text-lg mb-1">{review.title}</h3>}
                    {review.overview && <p className="text-gray-600">{review.overview}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Review ID: {review.id}</span>
                  <span>Doctor ID: {review.doctorId}</span>
                  <span>Reviewer: {review.reviewerId}</span>
                </div>
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

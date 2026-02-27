import React, { useState, useEffect, useCallback } from 'react';
import { reviewApi } from '../../api/review.api';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ReviewFeedPage: React.FC = () => {
  const { id: doctorId } = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadReviews = useCallback(async () => {
    if (!doctorId) return;
    try {
      const data = await reviewApi.getDoctorReviews(Number(doctorId), page, 10);
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load reviews');
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
                
                {review.title && (
                  <h3 className="font-medium text-lg mb-2">{review.title}</h3>
                )}
                
                <p className="text-gray-600">{review.overview}</p>
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

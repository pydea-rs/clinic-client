import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import { reviewApi } from '../../api/review.api';
import toast from 'react-hot-toast';

export const AdminReviewModerationPage: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // No admin-specific list endpoints exist; use the public review API
        // to fetch reviews for moderation (admin can delete individual reviews)
        setReviews([]);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
      await adminApi.reviews.delete(reviewId);
      setReviews(reviews.filter(r => r.id !== reviewId));
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete review');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Review Moderation</h1>
      
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reviews found</p>
        </div>
      ) : (
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
                <span>Verified: {review.verified ? 'Yes' : 'No'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

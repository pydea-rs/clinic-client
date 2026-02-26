import React, { useState, useEffect } from 'react';
import { reviewApi } from '../../api/review.api';
import { useParams } from 'react-router-dom';

export const ReviewFeedPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const [reviewsData, ratingData] = await Promise.all([
          reviewApi.listByDoctor(Number(id)),
          reviewApi.getRating(Number(id)),
        ]);
        setReviews(reviewsData.data || []);
        setRating(ratingData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reviews</h1>
      
      {/* Rating Widget */}
      {rating && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold">{rating.averageRating.toFixed(1)}</div>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={`text-2xl ${star <= Math.round(rating.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-gray-500">({rating.totalReviews} reviews)</span>
          </div>
          
          {/* Distribution Chart */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-8 text-sm">{star}★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400"
                    style={{ width: `${(rating.distribution[star] || 0) / rating.totalReviews * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500">{rating.distribution[star] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">User {review.reviewerId.substring(0, 8)}...</span>
                  <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-lg ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                      ★
                    </span>
                  ))}
                </div>
              </div>
              
              {review.title && <h3 className="font-medium mb-2">{review.title}</h3>}
              {review.overview && <p className="text-gray-700">{review.overview}</p>}
              
              {review.verified && (
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  Verified
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

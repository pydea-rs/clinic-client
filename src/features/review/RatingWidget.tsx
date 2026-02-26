import React from 'react';

export interface RatingWidgetProps {
  averageRating: number;
  totalReviews: number;
  distribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export const RatingWidget: React.FC<RatingWidgetProps> = ({
  averageRating,
  totalReviews,
  distribution,
}) => {
  const getStarColor = (star: number) => {
    if (averageRating >= star) return 'text-yellow-400';
    if (averageRating >= star - 0.5) return 'text-yellow-400';
    return 'text-gray-300';
  };

  const getStarWidth = (star: number) => {
    if (averageRating >= star) return 'w-full';
    if (averageRating >= star - 0.5) return 'w-1/2';
    return 'w-0';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Rating & Reviews</h2>
      
      <div className="flex items-center space-x-6 mb-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center space-x-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-5 h-5 ${getStarColor(star)}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {totalReviews} review{totalReviews !== 1 && 's'}
          </div>
        </div>

        {distribution && (
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 w-3">{star}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

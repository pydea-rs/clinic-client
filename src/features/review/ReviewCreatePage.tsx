import React, { useState } from 'react';
import { reviewApi } from '../../api/review.api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ReviewCreatePage: React.FC<{ doctorId: number; consultationId: string }> = ({ doctorId, consultationId }) => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [overview, setOverview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await reviewApi.create(doctorId, { title, overview, rating });
      toast.success('Review submitted successfully');
      navigate(`/doctor/${doctorId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Write a Review</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Brief summary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Overview</label>
          <textarea
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            rows={4}
            placeholder="Detailed review"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
};

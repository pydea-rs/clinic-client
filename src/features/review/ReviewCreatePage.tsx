import React, { useState } from 'react';
import { reviewApi } from '../../api';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';
export const ReviewCreatePage: React.FC = () => {
  const { id: doctorId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    overview: '',
    rating: 5,
  });

  const parsedDoctorId = Number(doctorId);

  if (!doctorId || Number.isNaN(parsedDoctorId)) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-red-600">Invalid doctor ID.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50">
          Go Back
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await reviewApi.createReview({
        doctorId: parsedDoctorId,
        title: formData.title || undefined,
        overview: formData.overview || undefined,
        rating: formData.rating,
      });
      toast.success('Review created successfully');
      navigate(`/doctor/${doctorId}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create review'));
    } finally {
      setLoading(false);
    }
  };

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Write a Review</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
          <div className="flex space-x-2">
            {stars.map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData({ ...formData, rating: star })}
                className={`text-3xl ${
                  formData.rating >= star ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title (Optional)</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Brief summary of your review"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Overview</label>
          <textarea
            value={formData.overview}
            onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            rows={5}
            placeholder="Share your experience..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-2 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>

      <button
        onClick={() => navigate(-1)}
        className="mt-4 w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  );
};

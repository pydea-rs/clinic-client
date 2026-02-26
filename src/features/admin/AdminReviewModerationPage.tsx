import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';

export const AdminReviewModerationPage: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        // Get all consultations to find doctors
        const consultations = await adminApi.consultations();
        // For now, show a placeholder
        setReviews([]);
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReviews();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Review Moderation</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Review moderation functionality coming soon.</p>
        <p className="text-sm text-gray-400 mt-2">
          This feature will allow admins to view and moderate all doctor reviews.
        </p>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { patientApi } from '../../../api/patient.api';
import toast from 'react-hot-toast';

interface PatientProfileFormProps {
  initialData?: any;
  onSubmitSuccess?: () => void;
}

export const PatientProfileForm: React.FC<PatientProfileFormProps> = ({
  initialData,
  onSubmitSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialData || {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData?.id) {
        await patientApi.updateProfile(formData);
        toast.success('Profile updated successfully');
      } else {
        await patientApi.createProfile(formData);
        toast.success('Profile created successfully');
      }
      onSubmitSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
        <input
          type="text"
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your location"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
        <textarea
          value={formData.bio || ''}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
          placeholder="About yourself"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium"
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
};

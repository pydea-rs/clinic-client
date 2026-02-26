import React, { useState, useEffect } from 'react';
import { doctorApi, DoctorProfile } from '../../api/doctor.api';
import { ArrayFieldEditor } from '../patient/components/ArrayFieldEditor';
import toast from 'react-hot-toast';

interface DoctorProfileFormProps {
  initialData?: DoctorProfile;
  onSubmitSuccess?: () => void;
}

export const DoctorProfileForm: React.FC<DoctorProfileFormProps> = ({
  initialData,
  onSubmitSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<DoctorProfile>>(
    initialData || {
      specialty: '',
      secondarySpecialties: [],
      startedAt: '',
      visitMethods: [],
      visitTypes: [],
      bio: '',
      clinicLocation: '',
    }
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData?.id) {
        await doctorApi.updateProfile(formData);
        toast.success('Profile updated successfully');
      } else {
        await doctorApi.createProfile(formData);
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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Specialty *</label>
          <input
            type="text"
            required
            value={formData.specialty || ''}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Cardiology"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Started Practicing</label>
          <input
            type="date"
            value={formData.startedAt ? formData.startedAt.split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <ArrayFieldEditor
        label="Secondary Specialties"
        items={formData.secondarySpecialties || []}
        onChange={(items) => setFormData({ ...formData, secondarySpecialties: items })}
        placeholder="e.g., Internal Medicine"
      />

      <ArrayFieldEditor
        label="Visit Methods"
        items={formData.visitMethods || []}
        onChange={(items) => setFormData({ ...formData, visitMethods: items })}
        placeholder="e.g., In-Person, Video Call"
      />

      <ArrayFieldEditor
        label="Visit Types"
        items={formData.visitTypes || []}
        onChange={(items) => setFormData({ ...formData, visitTypes: items })}
        placeholder="e.g., Consultation, Follow-up"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Location</label>
        <input
          type="text"
          value={formData.clinicLocation || ''}
          onChange={(e) => setFormData({ ...formData, clinicLocation: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 123 Medical Center, New York, NY"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
        <textarea
          value={formData.bio || ''}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={4}
          placeholder="Tell patients about yourself, your experience, and approach to care"
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

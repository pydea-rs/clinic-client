import React from 'react';
import { useForm } from 'react-hook-form';
import { patientApi } from '../../../api/patient.api';
import toast from 'react-hot-toast';

interface FormData {
  location?: string;
  visitMethods?: string[];
  bio?: string;
  medicalHistory?: string[];
  allergies?: string[];
  medications?: string[];
  surgeries?: string[];
  familyHistory?: string[];
}

interface PatientProfileFormProps {
  initialData?: any;
  onSubmitSuccess?: () => void;
}

export const PatientProfileForm: React.FC<PatientProfileFormProps> = ({
  initialData,
  onSubmitSuccess,
}) => {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: initialData || {
      medicalHistory: [],
      allergies: [],
      medications: [],
      surgeries: [],
      familyHistory: [],
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (initialData?.id) {
        await patientApi.updateProfile(data);
        toast.success('Profile updated successfully');
      } else {
        await patientApi.createProfile(data);
        toast.success('Profile created successfully');
      }
      onSubmitSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    }
  };

  const addToArray = (field: string, value: string) => {
    const current = watch(field) || [];
    setValue(field, [...current, value]);
  };

  const removeFromArray = (field: string, index: number) => {
    const current = watch(field) || [];
    const updated = current.filter((_, i) => i !== index);
    setValue(field, updated);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
        <input
          {...register('location')}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Your location"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Visit Methods</label>
        <select
          {...register('visitMethods')}
          multiple
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="CHAT">Chat</option>
          <option value="VOICE_CALL">Voice Call</option>
          <option value="VIDEO_CALL">Video Call</option>
          <option value="ON_SITE">On-site</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
        <textarea
          {...register('bio')}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="About you"
        />
      </div>

      {/* Array fields */}
      {['medicalHistory', 'allergies', 'medications', 'surgeries', 'familyHistory'].map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
            {field.replace(/([A-Z])/g, ' $1').trim()}
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    addToArray(field, value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              placeholder="Type and press Enter to add"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(watch(field) || []).map((item: string, index: number) => (
              <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {item}
                <button
                  type="button"
                  onClick={() => removeFromArray(field, index)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Profile' : 'Create Profile'}
      </button>
    </form>
  );
};

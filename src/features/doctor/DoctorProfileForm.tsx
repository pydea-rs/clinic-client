import React, { useState, useEffect } from 'react';
import { doctorApi, DoctorProfile } from '../../api';
import type {
  CreateDoctorProfilePayload,
  UpdateDoctorProfilePayload,
} from '../../api/doctor.api';
import type { DoctorSpecialty, VisitMethod, VisitType } from '../../lib/types/api';
import { formatSpecialty, formatVisitMethod, formatEnum } from '../../lib/format';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';

interface DoctorProfileFormProps {
  initialData?: DoctorProfile;
  onSubmitSuccess?: () => void;
}

// Enum value lists — these MUST match the backend Prisma enums exactly.
// The server validates with `forbidNonWhitelisted` + `@IsEnum`, so free-text
// values (e.g. "Cardiology") are rejected with HTTP 400. Use fixed choices.
const SPECIALTIES: DoctorSpecialty[] = [
  'CARDIOLOGY', 'DERMATOLOGY', 'ENT', 'GASTROENTEROLOGY', 'GYNECOLOGY',
  'NEUROLOGY', 'ONCOLOGY', 'ORTHOPEDICS', 'PEDIATRICS', 'PSYCHIATRY',
  'UROLOGY', 'GENERAL', 'OTHER',
];
const VISIT_METHODS: VisitMethod[] = ['CHAT', 'VOICE_CALL', 'VIDEO_CALL', 'ON_SITE'];
const VISIT_TYPES: VisitType[] = [
  'CONSULTATION', 'EXAMINATION', 'SURGERY', 'LABORATORY', 'RADIOLOGY',
  'PHARMACY', 'DENTISTRY', 'THERAPY', 'NUTRITION', 'OTHER',
];

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

  const toggle = <T extends string>(list: T[] | undefined, value: T): T[] => {
    const current = list || [];
    return current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
  };

  // Build a payload containing ONLY the fields the backend DTO accepts.
  // Spreading the full profile (id, userId, verified, createdAt, ...) would be
  // rejected by the server's `forbidNonWhitelisted` validation with HTTP 400.
  const buildPayload = (): CreateDoctorProfilePayload => {
    const f = formData;
    const payload: Partial<CreateDoctorProfilePayload> = {};
    if (f.specialty) payload.specialty = f.specialty as DoctorSpecialty;
    if (f.startedAt) payload.startedAt = f.startedAt;
    if (f.secondarySpecialties?.length) payload.secondarySpecialties = f.secondarySpecialties as DoctorSpecialty[];
    if (f.visitMethods?.length) payload.visitMethods = f.visitMethods as VisitMethod[];
    if (f.visitTypes?.length) payload.visitTypes = f.visitTypes as VisitType[];
    if (f.clinicLocation) payload.clinicLocation = f.clinicLocation;
    if (f.bio) payload.bio = f.bio;
    if (f.university) payload.university = f.university;
    if (f.phoneNumber) payload.phoneNumber = f.phoneNumber;
    if (f.languages?.length) payload.languages = f.languages;
    if (f.licenseNumber) payload.licenseNumber = f.licenseNumber;
    return payload as CreateDoctorProfilePayload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.specialty) {
      toast.error('Please select a primary specialty');
      return;
    }
    if (!initialData?.id && !formData.startedAt) {
      toast.error('Please provide the date you started practicing');
      return;
    }
    setLoading(true);
    try {
      const payload = buildPayload();
      if (initialData?.id) {
        // `startedAt` is accepted by the update DTO too, but the client type
        // omits it — cast to satisfy the adapter signature.
        await doctorApi.updateProfile(payload as UpdateDoctorProfilePayload);
        toast.success('Profile updated successfully');
      } else {
        await doctorApi.createProfile(payload);
        toast.success('Profile created successfully');
      }
      onSubmitSuccess?.();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save profile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-8 space-y-6 animate-slide-in-up">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Specialty *</label>
          <select
            required
            value={formData.specialty || ''}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            className="w-full px-4 py-2 input-focus bg-white"
          >
            <option value="" disabled>Select a specialty…</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{formatSpecialty(s)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Started Practicing</label>
          <input
            type="date"
            value={formData.startedAt ? formData.startedAt.split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
            className="w-full px-4 py-2 input-focus"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Specialties</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => {
            const active = (formData.secondarySpecialties || []).includes(s);
            return (
              <button
                type="button"
                key={s}
                onClick={() => setFormData({ ...formData, secondarySpecialties: toggle(formData.secondarySpecialties as DoctorSpecialty[], s) })}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${active ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {formatSpecialty(s)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Visit Methods</label>
        <div className="flex flex-wrap gap-2">
          {VISIT_METHODS.map((m) => {
            const active = (formData.visitMethods || []).includes(m);
            return (
              <button
                type="button"
                key={m}
                onClick={() => setFormData({ ...formData, visitMethods: toggle(formData.visitMethods as VisitMethod[], m) })}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {formatVisitMethod(m)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Visit Types</label>
        <div className="flex flex-wrap gap-2">
          {VISIT_TYPES.map((t) => {
            const active = (formData.visitTypes || []).includes(t);
            return (
              <button
                type="button"
                key={t}
                onClick={() => setFormData({ ...formData, visitTypes: toggle(formData.visitTypes as VisitType[], t) })}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${active ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {formatEnum(t)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Location</label>
        <input
          type="text"
          value={formData.clinicLocation || ''}
          onChange={(e) => setFormData({ ...formData, clinicLocation: e.target.value })}
          className="w-full px-4 py-2 input-focus"
          placeholder="e.g., 123 Medical Center, New York, NY"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
        <textarea
          value={formData.bio || ''}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="w-full px-4 py-2 input-focus resize-none"
          rows={4}
          placeholder="Tell patients about yourself, your experience, and approach to care"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
};

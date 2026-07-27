import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../../api';
import { DoctorProfileForm } from './DoctorProfileForm';
import { DoctorDocumentsPage } from './DoctorDocumentsPage';
import { formatSpecialty, formatEnum } from '../../lib/format';
import { User, FileText, Shield, Edit, Loader2, Mail, Phone, Globe, Award, CheckCircle, Clock, XCircle } from 'lucide-react';

export const DoctorProfileEnhancedPage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['doctor-my-profile'],
    queryFn: () => doctorApi.getMyProfile(),
  });

  const handleEditSuccess = () => {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: ['doctor-my-profile'] });
  };

  const getVerificationBadge = () => {
    if (!profile) return null;

    if (profile.verified) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">Verified</span>
        </div>
      );
    }

    if (profile.rejectionReason) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl">
          <XCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-medium text-red-700">Rejected</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-xl">
        <Clock className="w-4 h-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-700">Pending Verification</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Profile Not Found</h2>
          <p className="text-sm text-gray-500">Unable to load your doctor profile.</p>
        </div>
      </div>
    );
  }

  // Initials for avatar
  const initials = profile?.user
    ? `${profile.user.firstname[0] || ''}${profile.user.lastname[0] || ''}`.toUpperCase()
    : 'DR';

  const fullName = profile?.user
    ? `${profile.user.firstname} ${profile.user.lastname}`
    : 'Doctor';

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl flex items-center justify-center shadow-soft">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">My Profile</h1>
          <p className="text-sm text-gray-500">View and manage your professional profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Panel (Left ~65%) */}
        <div className="lg:col-span-3 space-y-6">
          {isEditing && profile ? (
            <div className="animate-slide-in-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
              <DoctorProfileForm
                initialData={profile}
                onSubmitSuccess={handleEditSuccess}
              />
            </div>
          ) : (
            /* Profile Display Card */
            <div className="card p-8 animate-slide-in-up">
              {/* Top section: Avatar + Name */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-soft">
                    <span className="text-2xl font-bold text-white">{initials}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
                    {profile?.specialty && (
                      <span className="badge badge-purple mt-1">
                        {formatSpecialty(profile.specialty)}
                      </span>
                    )}
                    {profile?.user?.email && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {profile.user.email}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary px-4 py-2 text-sm flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              </div>

              {/* Bio */}
              {profile?.bio && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">About</h3>
                  <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile?.phoneNumber && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{profile.phoneNumber}</p>
                    </div>
                  </div>
                )}

                {profile?.licenseNumber && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl">
                    <Award className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">License Number</p>
                      <p className="text-sm font-medium text-gray-900">{profile.licenseNumber}</p>
                    </div>
                  </div>
                )}

                {profile?.clinicLocation && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Clinic Location</p>
                      <p className="text-sm font-medium text-gray-900">{profile.clinicLocation}</p>
                    </div>
                  </div>
                )}

                {profile?.startedAt && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Practicing Since</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(profile.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Languages */}
              {profile?.languages && profile.languages.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang) => (
                      <span key={lang} className="badge badge-blue">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary Specialties */}
              {profile?.secondarySpecialties && profile.secondarySpecialties.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Secondary Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.secondarySpecialties.map((spec) => (
                      <span key={spec} className="badge badge-purple">
                        {formatSpecialty(spec)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Visit Methods */}
              {profile?.visitMethods && profile.visitMethods.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Visit Methods</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.visitMethods.map((method) => (
                      <span key={method} className="badge badge-green">
                        {formatEnum(method)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar (Right ~35%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Verification Status */}
          <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-gray-900">Verification Status</h3>
            </div>

            <div className="space-y-3">
              {getVerificationBadge()}

              {profile?.verified && profile.verifiedAt && (
                <p className="text-sm text-gray-500">
                  Verified on {new Date(profile.verifiedAt).toLocaleDateString()}
                </p>
              )}

              {profile?.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">Reason: </span>
                    {profile.rejectionReason}
                  </p>
                </div>
              )}

              {!profile?.verified && !profile?.rejectionReason && (
                <p className="text-sm text-gray-500">
                  Your profile is under review. Please ensure all required documents are uploaded.
                </p>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="card overflow-hidden animate-slide-in-up" style={{ animationDelay: '100ms' }}>
            <div className="px-6 py-4 border-b flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-gray-900">Documents</h3>
            </div>
            <DoctorDocumentsPage />
          </div>
        </div>
      </div>
    </div>
  );
};

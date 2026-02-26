import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../../api/doctor.api';
import { reviewApi } from '../../api/review.api';
import { Loader2, MapPin, CheckCircle, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RatingWidget } from '../review/RatingWidget';

export const DoctorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => doctorApi.getDoctorById(id!),
    enabled: !!id,
  });

  const { data: rating, isLoading: ratingLoading } = useQuery({
    queryKey: ['doctor-rating', id],
    queryFn: () => reviewApi.getDoctorRating(id!),
    enabled: !!id,
  });

  if (doctorLoading || ratingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Doctor Not Found</h2>
          <p className="text-gray-600">The doctor you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Dr. {doctor.specialty}</h1>
                {doctor.isVerified && (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                )}
              </div>
              <p className="text-lg text-gray-600 mb-4">{doctor.specialty}</p>

              {doctor.clinicLocation && (
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="w-5 h-5" />
                  {doctor.clinicLocation}
                </div>
              )}

              {/* Rating */}
              {rating && !ratingLoading && (
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.round(rating.averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {rating.averageRating.toFixed(1)}
                  </span>
                  <span className="text-gray-600">({rating.totalReviews} reviews)</span>
                </div>
              )}
            </div>

            <Link
              to={`/patient/consultations/create?doctorId=${doctor.id}`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Book Consultation
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2 space-y-8">
            {/* Bio */}
            {doctor.bio && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{doctor.bio}</p>
              </div>
            )}

            {/* Specialties */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Specialties</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Primary</p>
                  <p className="font-medium text-gray-900">{doctor.specialty}</p>
                </div>
                {doctor.secondarySpecialties && doctor.secondarySpecialties.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Secondary</p>
                    <div className="flex flex-wrap gap-2">
                      {doctor.secondarySpecialties.map((spec) => (
                        <span key={spec} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visit Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Visit Information</h2>
              <div className="grid grid-cols-2 gap-6">
                {doctor.visitMethods && doctor.visitMethods.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Visit Methods</p>
                    <div className="flex flex-wrap gap-2">
                      {doctor.visitMethods.map((method) => (
                        <span key={method} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {doctor.visitTypes && doctor.visitTypes.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Visit Types</p>
                    <div className="flex flex-wrap gap-2">
                      {doctor.visitTypes.map((type) => (
                        <span key={type} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Experience */}
            {doctor.startedAt && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Experience</h2>
                <p className="text-gray-700">
                  Practicing since {new Date(doctor.startedAt).getFullYear()}
                </p>
              </div>
            )}

            {/* Reviews Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
                <Link
                  to={`/doctor/${id}/reviews`}
                  className="text-blue-600 hover:underline"
                >
                  View all reviews
                </Link>
              </div>
              {rating && !ratingLoading ? (
                <RatingWidget
                  averageRating={rating.averageRating}
                  totalReviews={rating.totalReviews}
                  distribution={rating.distribution}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading rating information...</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-1">
            {/* CTA */}
            <Link
              to={`/patient/consultations/create?doctorId=${doctor.id}`}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center block mb-6"
            >
              Book Consultation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

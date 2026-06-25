import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../../api/doctor.api';
import { reviewApi } from '../../api/review.api';
import { Loader2, MapPin, CheckCircle, MessageSquare, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RatingWidget } from '../review/RatingWidget';
import { formatSpecialty } from '../../lib/format';

export const DoctorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const soapId = searchParams.get('soapId');

  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => {
      if (!id) {
        throw new Error('Doctor ID is required');
      }
      return doctorApi.getDoctorById(id);
    },
    enabled: !!id,
  });

  const { data: rating, isLoading: ratingLoading } = useQuery({
    queryKey: ['doctor-rating', id],
    queryFn: () => {
      if (!id) {
        throw new Error('Doctor ID is required');
      }
      return reviewApi.getDoctorRating(+id);
    },
    enabled: !!id,
  });

  if (doctorLoading || ratingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
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
      {/* Gradient Banner Header */}
      <div className="bg-gradient-to-r from-brand-600 to-purple-500 animate-fade-in">
        <div className="max-w-4xl mx-auto px-6 pt-10 pb-20">
          {/* Spacer for the gradient banner area */}
        </div>
      </div>

      {/* Profile Card overlapping the banner */}
      <div className="max-w-4xl mx-auto px-6 -mt-16">
        <div className="card card-glow rounded-2xl shadow-soft-xl p-8 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Doctor Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white font-bold text-3xl ring-4 ring-white shadow-soft-lg flex-shrink-0">
                {doctor.user
                  ? `${doctor.user.firstname?.[0] || ''}${doctor.user.lastname?.[0] || ''}`
                  : doctor.specialty?.[0] || 'D'}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Dr. {doctor.user ? `${doctor.user.firstname} ${doctor.user.lastname}` : doctor.specialty}
                  </h1>
                  {doctor.verified && (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  )}
                </div>
                <p className="text-lg text-gray-600 mb-4">{formatSpecialty(doctor.specialty)}</p>

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
                            i < Math.round(rating.averageRating || 0)
                              ? 'fill-amber-400 text-amber-400'
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
                      {(rating.averageRating || 0).toFixed(1)}
                    </span>
                    <span className="text-gray-600">({rating.totalReviews} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={`/slots/${doctor.id}${soapId ? `?soapId=${soapId}` : ''}`}
                className="btn-secondary px-6 py-3 flex items-center gap-2 text-base"
              >
                <Calendar className="w-5 h-5" />
                View Slots
              </Link>
              <Link
                to={`/patient/consultations/create?doctorId=${doctor.id}${soapId ? `&soapId=${soapId}` : ''}`}
                className="btn-primary px-6 py-3 flex items-center gap-2 text-base"
              >
                <MessageSquare className="w-5 h-5" />
                Book Consultation
              </Link>
            </div>
          </div>

          {/* Stats row */}
          {rating && !ratingLoading && (
            <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="counter-value text-3xl font-bold text-brand-600">{(rating.averageRating || 0).toFixed(1)}</p>
                <p className="text-sm text-gray-500 mt-1">Average Rating</p>
              </div>
              <div className="text-center">
                <p className="counter-value text-3xl font-bold text-brand-600">{rating.totalReviews}</p>
                <p className="text-sm text-gray-500 mt-1">Total Reviews</p>
              </div>
              <div className="text-center">
                <p className="counter-value text-3xl font-bold text-brand-600">
                  {doctor.startedAt
                    ? new Date().getFullYear() - new Date(doctor.startedAt).getFullYear()
                    : '--'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Years Experience</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2 space-y-8">
            {/* Bio */}
            {doctor.bio && (
              <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '0ms' }}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{doctor.bio}</p>
              </div>
            )}

            {/* Specialties */}
            <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '50ms' }}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Specialties</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Primary</p>
                  <span className="badge-brand">{formatSpecialty(doctor.specialty)}</span>
                </div>
                {doctor.secondarySpecialties && doctor.secondarySpecialties.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Secondary</p>
                    <div className="flex flex-wrap gap-2">
                      {doctor.secondarySpecialties.map((spec) => (
                        <span key={spec} className="badge badge-blue">
                          {formatSpecialty(spec)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visit Information */}
            <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Visit Information</h2>
              <div className="grid grid-cols-2 gap-6">
                {doctor.visitMethods && doctor.visitMethods.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Visit Methods</p>
                    <div className="flex flex-wrap gap-2">
                      {doctor.visitMethods.map((method) => (
                        <span key={method} className="badge badge-green">
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
                        <span key={type} className="badge badge-purple">
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
              <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '150ms' }}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Experience</h2>
                <p className="text-gray-700">
                  Practicing since {new Date(doctor.startedAt).getFullYear()}
                </p>
              </div>
            )}

            {/* Reviews Section */}
            <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
                <Link
                  to={`/doctor/${id}/reviews`}
                  className="text-brand-600 hover:text-brand-700 hover:underline font-medium transition-colors"
                >
                  View all reviews
                </Link>
              </div>
              {rating && !ratingLoading ? (
                <RatingWidget
                  averageRating={rating.averageRating || 0}
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
              to={`/patient/consultations/create?doctorId=${doctor.id}${soapId ? `&soapId=${soapId}` : ''}`}
              className="btn-primary w-full px-6 py-3 text-center block mb-4"
            >
              Book Consultation
            </Link>
            <Link
              to={`/slots/${doctor.id}${soapId ? `?soapId=${soapId}` : ''}`}
              className="btn-secondary w-full px-6 py-3 text-center block mb-6"
            >
              View Available Slots
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

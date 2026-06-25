import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../../api/doctor.api';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, MapPin, Star, Search, FileText } from 'lucide-react';

export const DoctorListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const soapId = searchParams.get('soapId');
  const initialSpecialty = searchParams.get('specialty') || '';

  const [page, setPage] = useState(1);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [visitMethod, setVisitMethod] = useState('');
  const [location, setLocation] = useState('');
  const [search, setSearch] = useState('');
  const limit = 12;

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', page, specialty, visitMethod, location, search],
    queryFn: () =>
      doctorApi.getDoctors({
        page,
        limit,
        specialty: specialty || undefined,
        visitMethod: visitMethod || undefined,
        location: location || undefined,
        search: search || undefined,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const isFilterEmpty = !search && !specialty && !visitMethod && !location;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-6 animate-fade-in">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4"><Search className="w-5 h-5" /></div>
          <h1 className="text-4xl font-bold mb-4">Find a Doctor</h1>
          <p className="text-blue-100 text-lg">Browse our network of verified healthcare professionals</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* SOAP Context Banner */}
        {soapId && (
          <div className="card border-brand-100 bg-brand-50/50 p-4 mb-6 flex items-center gap-3 animate-slide-in-up">
            <FileText className="w-5 h-5 text-brand-600 flex-shrink-0" />
            <p className="text-brand-800 text-sm font-medium">
              Based on your AI consultation{specialty ? `, we recommend a ${specialty.replace(/_/g, ' ')} specialist` : ', find a suitable doctor below'}.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="card p-6 mb-8 animate-slide-in-up" style={{ animationDelay: '50ms' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Doctor name..."
                  className={`w-full pl-10 pr-4 py-2 input-focus ${isFilterEmpty ? 'animate-breathe' : ''}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => {
                  setSpecialty(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g., Cardiology"
                className="w-full px-4 py-2 input-focus"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visit Method</label>
              <select
                value={visitMethod}
                onChange={(e) => {
                  setVisitMethod(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 input-focus"
              >
                <option value="">All Methods</option>
                <option value="CHAT">Chat</option>
                <option value="VOICE_CALL">Voice Call</option>
                <option value="VIDEO_CALL">Video Call</option>
                <option value="ON_SITE">On Site</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPage(1);
                }}
                placeholder="City or area..."
                className="w-full px-4 py-2 input-focus"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch('');
                  setSpecialty('');
                  setVisitMethod('');
                  setLocation('');
                  setPage(1);
                }}
                className="w-full px-4 py-2 btn-secondary font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : (
          <>
            <div className="mb-6 text-sm text-gray-600">
              Found {data?.total || 0} doctor{data?.total !== 1 ? 's' : ''}
            </div>

            {data?.doctors.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <p className="text-gray-600 text-lg">No doctors found matching your criteria</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 stagger-children">
                  {data?.doctors.map((doctor) => (
                    <Link
                      key={doctor.id}
                      to={`/doctor/${doctor.id}${soapId ? `?soapId=${encodeURIComponent(soapId)}` : ''}`}
                      className="card-interactive card-shine hover-lift overflow-hidden animate-slide-in-up"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-brand-200/50 flex-shrink-0">
                              {doctor.user
                                ? `${doctor.user.firstname?.[0] || ''}${doctor.user.lastname?.[0] || ''}`
                                : doctor.specialty?.[0] || 'D'}
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">
                                Dr. {doctor.user ? `${doctor.user.firstname} ${doctor.user.lastname}` : doctor.specialty}
                              </h3>
                              <span className="badge-brand text-xs">
                                {doctor.specialty}
                              </span>
                            </div>
                          </div>
                          {doctor.verified && (
                            <span className="badge badge-green">
                              Verified
                            </span>
                          )}
                        </div>

                        {doctor.clinicLocation && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <MapPin className="w-4 h-4" />
                            {doctor.clinicLocation}
                          </div>
                        )}

                        {doctor.rating !== undefined && (
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${
                                    i < Math.round(doctor.rating || 0)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-gray-800">
                              {doctor.rating?.toFixed(1)}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({doctor.totalReviews || 0})
                            </span>
                          </div>
                        )}

                        {doctor.bio && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4">{doctor.bio}</p>
                        )}

                        {doctor.visitMethods && doctor.visitMethods.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {doctor.visitMethods.slice(0, 2).map((method) => (
                              <span
                                key={method}
                                className="badge badge-blue"
                              >
                                {method}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

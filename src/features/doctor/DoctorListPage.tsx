import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../../api/doctor.api';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, Star, Search } from 'lucide-react';

export const DoctorListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [specialty, setSpecialty] = useState('');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-4">Find a Doctor</h1>
          <p className="text-blue-100 text-lg">Browse our network of verified healthcare professionals</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
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
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="In-Person">In-Person</option>
                <option value="Video Call">Video Call</option>
                <option value="Phone">Phone</option>
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
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="mb-6 text-sm text-gray-600">
              Found {data?.total || 0} doctor{data?.total !== 1 ? 's' : ''}
            </div>

            {data?.doctors.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">No doctors found matching your criteria</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {data?.doctors.map((doctor) => (
                    <Link
                      key={doctor.id}
                      to={`/doctor/${doctor.id}`}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">Dr. {doctor.specialty}</h3>
                            <p className="text-sm text-gray-600">{doctor.specialty}</p>
                          </div>
                          {doctor.isVerified && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
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
                                  className={`w-4 h-4 ${
                                    i < Math.round(doctor.rating || 0)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              {doctor.rating?.toFixed(1)} ({doctor.totalReviews || 0} reviews)
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
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
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
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

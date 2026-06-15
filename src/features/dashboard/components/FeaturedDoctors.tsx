import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../../../api/doctor.api';
import { MapPin, Star, Stethoscope } from 'lucide-react';

export const FeaturedDoctors: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['doctors-featured', { limit: 4 }],
    queryFn: () => doctorApi.getDoctors({ limit: 4 }),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Featured Doctors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const doctors = data?.doctors || [];

  if (doctors.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Featured Doctors</h3>
        <Link to="/doctors" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          See all doctors
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {doctors.map((doctor) => (
          <Link
            key={doctor.id}
            to={`/doctor/${doctor.id}`}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900 truncate">
                {doctor.user?.firstname} {doctor.user?.lastname}
              </span>
            </div>
            <p className="text-xs text-blue-600 font-medium mb-2">{doctor.specialty?.replace(/_/g, ' ')}</p>
            {doctor.clinicLocation && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{doctor.clinicLocation}</span>
              </div>
            )}
            {doctor.rating !== undefined && doctor.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-gray-600">{doctor.rating.toFixed(1)}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

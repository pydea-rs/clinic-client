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
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-medium text-sm text-gray-900 mb-3">Featured Doctors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-50 rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const doctors = data?.doctors || [];
  if (doctors.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-gray-900">Featured Doctors</h3>
        <Link to="/doctors" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          See all
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {doctors.map((doctor) => (
          <Link
            key={doctor.id}
            to={`/doctor/${doctor.id}`}
            className="border rounded-lg p-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-900 truncate">
                {doctor.user?.firstname} {doctor.user?.lastname}
              </span>
            </div>
            <p className="text-xs text-blue-600 font-medium mb-1.5">{doctor.specialty?.replace(/_/g, ' ')}</p>
            {doctor.clinicLocation && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{doctor.clinicLocation}</span>
              </div>
            )}
            {doctor.rating !== undefined && doctor.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-[11px] text-gray-500">{doctor.rating.toFixed(1)}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../../../api/doctor.api';
import { MapPin, Star, Stethoscope, Users } from 'lucide-react';

export const FeaturedDoctors: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['doctors-featured', { limit: 4 }],
    queryFn: () => doctorApi.getDoctors({ limit: 4 }),
  });

  if (isLoading) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Featured Doctors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const doctors = data?.doctors || [];
  if (doctors.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-gray-900">Featured Doctors</h3>
        </div>
        <Link to="/doctors" className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors">
          See all
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {doctors.map((doctor) => (
          <Link
            key={doctor.id}
            to={`/doctor/${doctor.id}`}
            className="border border-gray-100 rounded-xl p-4 hover:border-brand-200 hover:shadow-soft transition-all duration-300 ease-spring group hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-50 to-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-brand-100/50 group-hover:ring-brand-200 transition-all duration-200">
                <Stethoscope className="w-4 h-4 text-brand-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-700 transition-colors">
                {doctor.user?.firstname} {doctor.user?.lastname}
              </span>
            </div>
            <p className="text-xs text-brand-600 font-semibold mb-2">{doctor.specialty?.replace(/_/g, ' ')}</p>
            {doctor.clinicLocation && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{doctor.clinicLocation}</span>
              </div>
            )}
            {doctor.rating !== undefined && doctor.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-medium text-gray-600">{doctor.rating.toFixed(1)}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

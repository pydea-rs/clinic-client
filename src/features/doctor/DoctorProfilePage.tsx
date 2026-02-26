import React, { useState, useEffect } from 'react';
import { doctorApi } from '../../api/doctor.api';
import { useParams } from 'react-router-dom';

export const DoctorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDoctor = async () => {
      if (!id) return;
      try {
        const data = await doctorApi.getById(Number(id));
        setDoctor(data);
      } catch (error) {
        console.error('Failed to load doctor:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDoctor();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!doctor) {
    return <div className="flex items-center justify-center min-h-screen">Doctor not found</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Doctor Profile</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-blue-600">
              {doctor.user?.firstname?.[0]}{doctor.user?.lastname?.[0]}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{doctor.user?.firstname} {doctor.user?.lastname}</h2>
            <p className="text-lg text-gray-600">{doctor.specialty}</p>
            {doctor.secondarySpecialties?.length > 0 && (
              <p className="text-sm text-gray-500">
                Secondary: {doctor.secondarySpecialties.join(', ')}
              </p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-gray-500">Started Practice:</span>
            <p className="font-medium">{new Date(doctor.startedAt).getFullYear()}</p>
          </div>
          {doctor.university && (
            <div>
              <span className="text-gray-500">University:</span>
              <p className="font-medium">{doctor.university}</p>
            </div>
          )}
          {doctor.location && (
            <div>
              <span className="text-gray-500">Location:</span>
              <p className="font-medium">{doctor.location}</p>
            </div>
          )}
          {doctor.clinicLocation && (
            <div>
              <span className="text-gray-500">Clinic:</span>
              <p className="font-medium">{doctor.clinicLocation}</p>
            </div>
          )}
        </div>
        
        {doctor.bio && (
          <div className="mb-6">
            <h3 className="font-bold mb-2">About</h3>
            <p className="text-gray-700">{doctor.bio}</p>
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="font-bold mb-2">Visit Methods</h3>
          <div className="flex flex-wrap gap-2">
            {doctor.visitMethods?.map((method: string) => (
              <span key={method} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {method.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        
        {doctor.verified ? (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <span>✓</span>
            <span>Verified Doctor</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <span>○</span>
            <span>Verification Pending</span>
          </div>
        )}
      </div>
    </div>
  );
};

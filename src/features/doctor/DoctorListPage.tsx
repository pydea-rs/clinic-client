import React, { useState, useEffect } from 'react';
import { doctorApi } from '../../api/doctor.api';
import { Link } from 'react-router-dom';

export const DoctorListPage: React.FC = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    specialty: '',
    visitMethod: '',
    location: '',
    name: '',
  });

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const data = await doctorApi.list();
        setDoctors(data.data || []);
      } catch (error) {
        console.error('Failed to load doctors:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDoctors();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredDoctors = doctors.filter(doctor => {
    if (filters.specialty && !doctor.specialty.includes(filters.specialty)) return false;
    if (filters.visitMethod && !doctor.visitMethods?.includes(filters.visitMethod)) return false;
    if (filters.location && !doctor.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.name && !(`${doctor.user?.firstname} ${doctor.user?.lastname}`.toLowerCase().includes(filters.name.toLowerCase()))) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Find a Doctor</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
            <select
              name="specialty"
              value={filters.specialty}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">All</option>
              <option value="CARDIOLOGY">Cardiology</option>
              <option value="DERMATOLOGY">Dermatology</option>
              <option value="ENT">ENT</option>
              <option value="GASTROENTEROLOGY">Gastroenterology</option>
              <option value="GYNECOLOGY">Gynecology</option>
              <option value="NEUROLOGY">Neurology</option>
              <option value="ONCOLOGY">Oncology</option>
              <option value="ORTHOPEDICS">Orthopedics</option>
              <option value="PEDIATRICS">Pediatrics</option>
              <option value="PSYCHIATRY">Psychiatry</option>
              <option value="UROLOGY">Urology</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visit Method</label>
            <select
              name="visitMethod"
              value={filters.visitMethod}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">All</option>
              <option value="CHAT">Chat</option>
              <option value="VOICE_CALL">Voice Call</option>
              <option value="VIDEO_CALL">Video Call</option>
              <option value="ON_SITE">On-site</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Search by location"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Search by name"
            />
          </div>
        </div>
      </div>

      {/* Doctors List */}
      {filteredDoctors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No doctors found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => (
            <div key={doctor.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {doctor.user?.firstname?.[0]}{doctor.user?.lastname?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{doctor.user?.firstname} {doctor.user?.lastname}</h3>
                  <p className="text-sm text-gray-500">{doctor.specialty}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {doctor.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">📍</span>
                    <span>{doctor.location}</span>
                  </div>
                )}
                {doctor.clinicLocation && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">🏥</span>
                    <span>{doctor.clinicLocation}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">📞</span>
                  <span>{doctor.visitMethods?.join(', ')}</span>
                </div>
              </div>
              
              <Link
                to={`/doctor/${doctor.id}`}
                className="mt-4 block w-full bg-blue-600 text-white py-2 rounded-lg text-center hover:bg-blue-700"
              >
                View Profile
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

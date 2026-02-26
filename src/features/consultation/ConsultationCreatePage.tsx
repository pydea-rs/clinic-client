import React, { useState, useEffect } from 'react';
import { consultationApi } from '../../api/consultation.api';
import { doctorApi } from '../../api/doctor.api';
import { patientApi } from '../../api/patient.api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ConsultationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [soaps, setSoaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedSoap, setSelectedSoap] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [doctorsData, soapsData] = await Promise.all([
          doctorApi.list(),
          patientApi.getSoaps(),
        ]);
        setDoctors(doctorsData.data || []);
        setSoaps(soapsData.data || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }

    setSubmitting(true);
    try {
      await consultationApi.create({
        doctorId: Number(selectedDoctor),
        soapId: selectedSoap || undefined,
      });
      toast.success('Consultation created successfully');
      navigate('/patient/consultations');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create consultation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Consultation</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor</label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          >
            <option value="">Select a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.user?.firstname} {doctor.user?.lastname} - {doctor.specialty}
              </option>
            ))}
          </select>
        </div>

        {soaps.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select SOAP (Optional)</label>
            <select
              value={selectedSoap}
              onChange={(e) => setSelectedSoap(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">No SOAP</option>
              {soaps.map((soap) => (
                <option key={soap.id} value={soap.id}>
                  {soap.suggestedSpecialty || 'No specialty'} - {new Date(soap.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
        >
          {submitting ? 'Creating...' : 'Create Consultation'}
        </button>
      </form>
    </div>
  );
};

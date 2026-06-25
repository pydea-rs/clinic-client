import React, { useState, useEffect } from 'react';
import { consultationApi } from '../../api/consultation.api';
import { doctorApi } from '../../api/doctor.api';
import { patientApi } from '../../api/patient.api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DoctorProfile } from '../../api/doctor.api';
import { PatientSOAP } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';
import { Loader2, PlusCircle } from 'lucide-react';
import { formatSpecialty } from '../../lib/format';

export const ConsultationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [soaps, setSoaps] = useState<PatientSOAP[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedSoap, setSelectedSoap] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [doctorsData, soapsData] = await Promise.all([
          doctorApi.getDoctors(),
          patientApi.getSOAPs(),
        ]);
        setDoctors(doctorsData.doctors || []);
        setSoaps(soapsData.soaps || []);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'Failed to load doctors or SOAP notes'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const doctorIdFromQuery = searchParams.get('doctorId');
    const soapIdFromQuery = searchParams.get('soapId');
    if (doctorIdFromQuery) {
      setSelectedDoctor(doctorIdFromQuery);
    }
    if (soapIdFromQuery) {
      setSelectedSoap(soapIdFromQuery);
    }
  }, [searchParams]);

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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create consultation'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8 animate-slide-in-up">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center shadow-soft">
          <PlusCircle className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold gradient-text">Create Consultation</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="card p-8 space-y-6 animate-slide-in-up" style={{ animationDelay: '60ms' }}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor</label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="w-full px-4 py-2.5 input-focus"
            required
            disabled={submitting}
          >
            <option value="">Select a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.user?.firstname} {doctor.user?.lastname} - {formatSpecialty(doctor.specialty)}
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
              className="w-full px-4 py-2.5 input-focus"
              disabled={submitting}
            >
              <option value="">No SOAP</option>
              {soaps.map((soap) => (
                <option key={soap.id} value={soap.id}>
                  {soap.suggestedSpecialty ? formatSpecialty(soap.suggestedSpecialty) : 'No specialty'} - {new Date(soap.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary py-2.5 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Consultation'}
        </button>
      </form>
    </div>
  );
};

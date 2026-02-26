import React, { useState, useEffect } from 'react';
import { PatientProfileForm } from './components/PatientProfileForm';
import { patientApi } from '../../api/patient.api';

export const PatientProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await patientApi.getProfile();
        setProfile(data);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSuccess = () => {
    loadProfile();
  };

  const loadProfile = async () => {
    try {
      const data = await patientApi.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Patient Profile</h1>
      <PatientProfileForm initialData={profile} onSubmitSuccess={handleSuccess} />
    </div>
  );
};

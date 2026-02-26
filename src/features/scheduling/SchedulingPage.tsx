import React from 'react';

export const SchedulingPage: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Scheduling & Booking</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-4">Doctor Availability</h2>
          <p className="text-gray-500 mb-4">Manage your weekly schedule, slot durations, and exceptions.</p>
          <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Manage Schedule
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-4">Book Appointment</h2>
          <p className="text-gray-500 mb-4">Select a doctor, date, and time slot to book an appointment.</p>
          <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

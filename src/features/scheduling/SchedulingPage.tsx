import React from 'react';

export const SchedulingPage: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white shadow-soft">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Scheduling & Booking</h1>
            <p className="text-gray-500 text-sm">Manage availability and book appointments</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card card-hover p-6 animate-slide-in-up" style={{ animationDelay: '50ms' }}>
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
          </div>
          <h2 className="font-bold mb-2">Doctor Availability</h2>
          <p className="text-gray-500 text-sm mb-5">Manage your weekly schedule, slot durations, and exceptions.</p>
          <button className="btn-primary w-full py-2.5">
            Manage Schedule
          </button>
        </div>

        <div className="card card-hover p-6 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
          </div>
          <h2 className="font-bold mb-2">Book Appointment</h2>
          <p className="text-gray-500 text-sm mb-5">Select a doctor, date, and time slot to book an appointment.</p>
          <button className="btn-primary w-full py-2.5">
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

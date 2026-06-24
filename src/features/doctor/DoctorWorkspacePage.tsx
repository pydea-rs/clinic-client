import React from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, FileText, Calendar, MessageSquare, Settings } from 'lucide-react';

export const DoctorWorkspacePage: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl flex items-center justify-center shadow-soft">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-sm text-gray-500">Manage your practice</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        <Link to="/doctor/profile" className="card-interactive p-6 animate-slide-in-up">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-brand-600 rounded-xl shadow-soft flex items-center justify-center mb-4">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold mb-2 text-gray-900">My Profile</h3>
          <p className="text-gray-500 text-sm">Manage your profile, specialties, and bio</p>
        </Link>
        
        <Link to="/doctor/documents" className="card-interactive p-6 animate-slide-in-up">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-soft flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold mb-2 text-gray-900">Documents</h3>
          <p className="text-gray-500 text-sm">Upload and manage verification documents</p>
        </Link>
        
        <Link to="/doctor/scheduling" className="card-interactive p-6 animate-slide-in-up">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-soft flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold mb-2 text-gray-900">Scheduling</h3>
          <p className="text-gray-500 text-sm">Manage your availability and appointments</p>
        </Link>
        
        <Link to="/doctor/consultations" className="card-interactive p-6 animate-slide-in-up">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-soft flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold mb-2 text-gray-900">Consultations</h3>
          <p className="text-gray-500 text-sm">View and manage patient consultations</p>
        </Link>
        
        <Link to="/doctor/chat" className="card-interactive p-6 animate-slide-in-up">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-soft flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold mb-2 text-gray-900">Chat</h3>
          <p className="text-gray-500 text-sm">Communicate with patients</p>
        </Link>
        
        <Link to="/doctor/settings" className="card-interactive p-6 animate-slide-in-up">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl shadow-soft flex items-center justify-center mb-4">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold mb-2 text-gray-900">Settings</h3>
          <p className="text-gray-500 text-sm">Account settings and preferences</p>
        </Link>
      </div>
    </div>
  );
};

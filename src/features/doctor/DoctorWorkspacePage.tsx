import React from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, FileText, Calendar, MessageSquare, Settings } from 'lucide-react';

export const DoctorWorkspacePage: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Doctor Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/doctor/profile" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <UserCheck className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold mb-2">My Profile</h3>
          <p className="text-gray-500 text-sm">Manage your profile, specialties, and bio</p>
        </Link>
        
        <Link to="/doctor/documents" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold mb-2">Documents</h3>
          <p className="text-gray-500 text-sm">Upload and manage verification documents</p>
        </Link>
        
        <Link to="/doctor/scheduling" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold mb-2">Scheduling</h3>
          <p className="text-gray-500 text-sm">Manage your availability and appointments</p>
        </Link>
        
        <Link to="/doctor/consultations" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="font-bold mb-2">Consultations</h3>
          <p className="text-gray-500 text-sm">View and manage patient consultations</p>
        </Link>
        
        <Link to="/doctor/chat" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-teal-600" />
          </div>
          <h3 className="font-bold mb-2">Chat</h3>
          <p className="text-gray-500 text-sm">Communicate with patients</p>
        </Link>
        
        <Link to="/doctor/settings" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <Settings className="w-6 h-6 text-gray-600" />
          </div>
          <h3 className="font-bold mb-2">Settings</h3>
          <p className="text-gray-500 text-sm">Account settings and preferences</p>
        </Link>
      </div>
    </div>
  );
};

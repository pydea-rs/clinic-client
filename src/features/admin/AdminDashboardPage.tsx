import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await adminApi.stats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Total Users</div>
          <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Total Doctors</div>
          <div className="text-2xl font-bold">{stats?.totalDoctors || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Total Patients</div>
          <div className="text-2xl font-bold">{stats?.totalPatients || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Consultations</div>
          <div className="text-2xl font-bold">{stats?.totalConsultations || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Pending Verifications</div>
          <div className="text-2xl font-bold">{stats?.pendingVerifications || 0}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Link to="/admin/users" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h3 className="font-bold mb-2">User Management</h3>
          <p className="text-gray-500 text-sm">List, edit, and manage all users</p>
        </Link>
        <Link to="/admin/verifications" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h3 className="font-bold mb-2">Doctor Verifications</h3>
          <p className="text-gray-500 text-sm">Review and approve doctor applications</p>
        </Link>
        <Link to="/admin/reviews" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h3 className="font-bold mb-2">Review Moderation</h3>
          <p className="text-gray-500 text-sm">Manage flagged and reported reviews</p>
        </Link>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import { Link } from 'react-router-dom';
import { User, UserCheck, MessageSquare, Star, Clock } from 'lucide-react';

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
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <StatCard 
          icon={<User className="w-6 h-6" />}
          label="Total Users"
          value={stats?.totalUsers || 0}
          color="blue"
        />
        <StatCard 
          icon={<UserCheck className="w-6 h-6" />}
          label="Total Doctors"
          value={stats?.totalDoctors || 0}
          color="green"
        />
        <StatCard 
          icon={<User className="w-6 h-6" />}
          label="Total Patients"
          value={stats?.totalPatients || 0}
          color="purple"
        />
        <StatCard 
          icon={<MessageSquare className="w-6 h-6" />}
          label="Consultations"
          value={stats?.totalConsultations || 0}
          color="orange"
        />
        <StatCard 
          icon={<Clock className="w-6 h-6" />}
          label="Pending Verifications"
          value={stats?.pendingVerifications || 0}
          color="yellow"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ActionCard 
          to="/admin/users"
          icon={<User className="w-8 h-8" />}
          title="User Management"
          description="List, edit, and manage all users"
        />
        <ActionCard 
          to="/admin/verifications"
          icon={<UserCheck className="w-8 h-8" />}
          title="Doctor Verifications"
          description="Review and approve doctor applications"
        />
        <ActionCard 
          to="/admin/reviews"
          icon={<Star className="w-8 h-8" />}
          title="Review Moderation"
          description="Manage flagged and reported reviews"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="text-gray-500 text-center py-8">
          <p>Activity feed coming soon...</p>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <div className="text-gray-500 text-sm font-medium">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
};

interface ActionCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ to, icon, title, description }) => (
  <Link to={to} className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow group">
    <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mb-4 group-hover:bg-gray-100 transition-colors">
      <div className="text-gray-600 group-hover:text-gray-900 transition-colors">
        {icon}
      </div>
    </div>
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
  </Link>
);

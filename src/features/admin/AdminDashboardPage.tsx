import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import { Link } from 'react-router-dom';
import { User, UserCheck, MessageSquare, Star, Clock, LayoutDashboard } from 'lucide-react';
import { PlatformStats } from '../../lib/types/api';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await adminApi.stats();
        setStats(data);
      } catch {
        // Dashboard renders without stats on failure
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 shimmer rounded-xl" />
          <div className="space-y-2">
            <div className="w-48 h-6 shimmer" />
            <div className="w-64 h-4 shimmer" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="w-12 h-12 shimmer rounded-xl mb-3" />
              <div className="w-20 h-4 shimmer mb-2" />
              <div className="w-16 h-8 shimmer" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="w-14 h-14 shimmer rounded-xl mb-4" />
              <div className="w-32 h-5 shimmer mb-2" />
              <div className="w-48 h-4 shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-purple-500 rounded-xl flex items-center justify-center shadow-soft">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Platform overview and quick actions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 stagger-children">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <div className="card p-6 animate-slide-in-up">
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
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-emerald-500 to-teal-500',
    purple: 'from-purple-500 to-fuchsia-500',
    orange: 'from-orange-500 to-amber-500',
    yellow: 'from-amber-500 to-yellow-500',
  };

  return (
    <div className="card card-hover p-6 animate-slide-in-up">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} text-white shadow-sm`}>
        {icon}
      </div>
      <div className="text-gray-500 text-sm font-medium">{label}</div>
      <div className="text-3xl font-bold mt-1 animate-count-up counter-value">{value}</div>
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
  <Link to={to} className="block card-interactive p-6 group animate-slide-in-up">
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center mb-4 shadow-sm">
      <div className="text-white">
        {icon}
      </div>
    </div>
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
  </Link>
);

import React, { useState } from 'react';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { authApi } from '../../../api/auth.api';
import { User, Shield, Stethoscope, UserCog, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SeedAccount {
  id: string;
  email: string;
  password: string;
  role: string;
  firstname: string;
  lastname: string;
  description: string;
  icon: React.ReactNode;
}

const seedAccounts: SeedAccount[] = [
  {
    id: 'patient-1',
    email: 'patient@test.com',
    password: 'password123',
    role: 'PATIENT',
    firstname: 'John',
    lastname: 'Patient',
    description: 'Test patient account with profile and consultations',
    icon: <User className="w-5 h-5" />,
  },
  {
    id: 'patient-2',
    email: 'patient2@test.com',
    password: 'password123',
    role: 'PATIENT',
    firstname: 'Jane',
    lastname: 'Smith',
    description: 'Secondary patient account for testing',
    icon: <User className="w-5 h-5" />,
  },
  {
    id: 'doctor-1',
    email: 'doctor@test.com',
    password: 'password123',
    role: 'DOCTOR',
    firstname: 'Dr. Sarah',
    lastname: 'Doctor',
    description: 'Test doctor account with profile and availability',
    icon: <Stethoscope className="w-5 h-5" />,
  },
  {
    id: 'doctor-2',
    email: 'doctor2@test.com',
    password: 'password123',
    role: 'DOCTOR',
    firstname: 'Dr. Michael',
    lastname: 'Johnson',
    description: 'Secondary doctor account for testing',
    icon: <Stethoscope className="w-5 h-5" />,
  },
  {
    id: 'admin-1',
    email: 'admin@test.com',
    password: 'password123',
    role: 'ADMIN',
    firstname: 'Admin',
    lastname: 'User',
    description: 'Admin account (requires isAdmin flag in database)',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: 'superadmin-1',
    email: 'superadmin@test.com',
    password: 'password123',
    role: 'SUPERADMIN',
    firstname: 'Super',
    lastname: 'Admin',
    description: 'Superadmin account (requires isSuperAdmin flag in database)',
    icon: <UserCog className="w-5 h-5" />,
  },
];

export const AccountSwitcher: React.FC = () => {
  const { user, setUser, setAuthenticated } = useAuthStore();
  const [switching, setSwitching] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const handleSwitch = async (account: SeedAccount) => {
    setSwitching(true);
    setSelectedAccount(account.id);

    try {
      // Logout current user
      try {
        await authApi.logout();
      } catch {
        // Ignore logout errors
      }

      // Login with seed account
      const response = await authApi.login({
        email: account.email,
        password: account.password,
      });

      setUser(response);
      setAuthenticated(true);
      toast.success(`Switched to ${account.firstname} ${account.lastname}`);
      
      // Reload to refresh all state
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to switch account');
    } finally {
      setSwitching(false);
      setSelectedAccount(null);
    }
  };

  const handleCreateAccount = async (account: SeedAccount) => {
    setSwitching(true);
    setSelectedAccount(account.id);

    try {
      await authApi.register({
        email: account.email,
        password: account.password,
        firstname: account.firstname,
        lastname: account.lastname,
        role: account.role as any,
      });

      toast.success(`Created account: ${account.email}`);
      
      // Now login
      await handleSwitch(account);
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        toast.error('Account already exists, trying to login...');
        await handleSwitch(account);
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setSwitching(false);
      setSelectedAccount(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PATIENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DOCTOR':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ADMIN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SUPERADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Seed Account Quick Switch</h2>
        <p className="text-gray-600 mb-4">
          Switch between test accounts for multi-role testing (DEV only)
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <div className="font-medium mb-1">Important Notes:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>These are test accounts for local development only</li>
              <li>Admin/Superadmin accounts require database flags to be set manually</li>
              <li>Click "Create & Switch" if account doesn't exist yet</li>
              <li>Click "Switch" to login to existing account</li>
            </ul>
          </div>
        </div>
      </div>

      {user && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-900 mb-1">Currently logged in as:</div>
          <div className="text-blue-800">
            {user.firstname} {user.lastname} ({user.email})
          </div>
          <div className="text-sm text-blue-600 mt-1">
            Role: {user.role} {user.isAdmin && '• Admin'} {user.isSuperAdmin && '• Superadmin'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {seedAccounts.map((account) => {
          const isCurrentUser = user?.email === account.email;
          const isSwitching = switching && selectedAccount === account.id;

          return (
            <div
              key={account.id}
              className={`border rounded-lg p-4 ${
                isCurrentUser ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${getRoleColor(account.role)}`}>
                  {account.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {account.firstname} {account.lastname}
                  </div>
                  <div className="text-sm text-gray-600">{account.email}</div>
                  <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${getRoleColor(account.role)}`}>
                    {account.role}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">{account.description}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSwitch(account)}
                  disabled={switching || isCurrentUser}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCurrentUser
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
                  }`}
                >
                  {isSwitching ? 'Switching...' : isCurrentUser ? 'Current' : 'Switch'}
                </button>
                <button
                  onClick={() => handleCreateAccount(account)}
                  disabled={switching || isCurrentUser}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  Create & Switch
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Password: {account.password}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm font-medium text-gray-900 mb-2">Manual Database Setup for Admin Accounts:</div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>To enable admin/superadmin privileges, run these SQL commands:</p>
          <pre className="bg-white p-2 rounded border border-gray-300 mt-2 overflow-x-auto text-xs">
{`-- Make user an admin
UPDATE "User" SET "isAdmin" = true WHERE email = 'admin@test.com';

-- Make user a superadmin
UPDATE "User" SET "isAdmin" = true, "isSuperAdmin" = true WHERE email = 'superadmin@test.com';`}
          </pre>
        </div>
      </div>
    </div>
  );
};

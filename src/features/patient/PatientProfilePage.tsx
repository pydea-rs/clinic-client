import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { userApi, UpdateProfilePayload } from '../../api/user.api';
import toast from 'react-hot-toast';
import { Loader2, Upload, User } from 'lucide-react';
import { getErrorMessage } from '../../lib/api/error.utils';

export const PatientProfilePage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userApi.getCurrentUser(),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userApi.updateProfile(payload),
    onSuccess: () => {
      toast.success('Profile updated successfully');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => userApi.uploadAvatar(file),
    onSuccess: () => {
      toast.success('Avatar uploaded successfully');
      setAvatarFile(null);
      setAvatarPreview('');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to upload avatar'));
    },
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstname: user.firstname || '',
        lastname: user.lastname || '',
      });
      if (user.avatar) {
        setAvatarPreview(user.avatar);
      }
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (avatarFile) {
      await avatarMutation.mutateAsync(avatarFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8 animate-slide-in-up">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-soft">
          <User className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold gradient-text">My Profile</h1>
      </div>

      <div className="card p-8 space-y-8 animate-slide-in-up" style={{ animationDelay: '60ms' }}>
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden mb-4 ring-4 ring-white shadow-soft-lg">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400 text-4xl">👤</span>
            )}
          </div>
          <label className="btn-secondary flex items-center gap-2 px-4 py-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Choose Avatar
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
          {avatarFile && (
            <button
              onClick={handleAvatarUpload}
              disabled={avatarMutation.isPending}
              className="mt-2 btn-primary px-4 py-2 disabled:opacity-50"
            >
              {avatarMutation.isPending ? 'Uploading...' : 'Upload Avatar'}
            </button>
          )}
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstname}
                onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                className="w-full px-4 py-2.5 input-focus"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.lastname}
                onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                className="w-full px-4 py-2.5 input-focus"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full btn-primary py-2.5 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

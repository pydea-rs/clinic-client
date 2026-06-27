import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../lib/stores/auth.store';
import { userApi, UpdateProfilePayload } from '../api/user.api';
import { getErrorMessage } from '../lib/api/error.utils';
import toast from 'react-hot-toast';
import {
  X,
  User,
  Lock,
  Mail,
  Camera,
  Loader2,
  Eye,
  EyeOff,
  Check,
  Shield,
  Upload,
} from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'security';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const { user, setUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (user && open) {
      setFirstname(user.firstname);
      setLastname(user.lastname);
      setEmail(user.email);
      setIsPrivate(user.isPrivate);
      setAvatarPreview(user.avatar || '');
      setAvatarFile(null);
      setProfileDirty(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPw(false);
      setShowNewPw(false);
      setShowConfirmPw(false);
    }
  }, [user, open]);

  if (!open || !user) return null;

  const hasProfileChanges =
    firstname !== user.firstname ||
    lastname !== user.lastname ||
    email !== user.email ||
    isPrivate !== user.isPrivate;

  const passwordValid = PASSWORD_REGEX.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const canChangePassword =
    currentPassword.length > 0 &&
    passwordValid &&
    passwordsMatch &&
    !passwordSaving;

  const handleProfileSave = async () => {
    if (!hasProfileChanges) return;

    const payload: UpdateProfilePayload = {};
    if (firstname !== user.firstname) payload.firstname = firstname;
    if (lastname !== user.lastname) payload.lastname = lastname;
    if (email !== user.email) payload.email = email;
    if (isPrivate !== user.isPrivate) payload.isPrivate = isPrivate;

    setProfileSaving(true);
    try {
      const updated = await userApi.updateProfile(payload);
      setUser(updated);
      setProfileDirty(false);
      toast.success('Profile updated');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarUploading(true);
    try {
      const result = await userApi.uploadAvatar(avatarFile);
      setUser({ ...user, avatar: result.url });
      setAvatarFile(null);
      toast.success('Avatar updated');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to upload avatar'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!canChangePassword) return;

    setPasswordSaving(true);
    try {
      await userApi.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to change password'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Shield },
  ];

  const userInitials = `${user.firstname?.[0] || ''}${user.lastname?.[0] || ''}`.toUpperCase();

  const passwordChecks = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'One digit', met: /[0-9]/.test(newPassword) },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-slate-700/60 animate-scale-in overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
            <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">Account Settings</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4.5 h-4.5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-slate-800 flex-shrink-0 px-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 -mb-px ${
                  tab === t.key
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === 'profile' && (
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/50 dark:to-brand-800/30 flex items-center justify-center overflow-hidden ring-4 ring-brand-200/40 dark:ring-brand-800/40 shadow-lg">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{userInitials}</span>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 hover:bg-brand-700 text-white rounded-lg flex items-center justify-center shadow-md transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </div>
                  {avatarFile && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {avatarFile.name} ({(avatarFile.size / 1024 / 1024).toFixed(1)}MB)
                      </span>
                      <button
                        onClick={handleAvatarUpload}
                        disabled={avatarUploading}
                        className="btn-primary px-3 py-1 text-xs flex items-center gap-1.5"
                      >
                        {avatarUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        {avatarUploading ? 'Uploading...' : 'Upload'}
                      </button>
                      <button
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(user.avatar || '');
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Role & Member Since */}
                <div className="flex items-center justify-center gap-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wider uppercase badge-brand">
                    {user.role === 'NONE' ? 'Guest' : user.role}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="h-px bg-gray-100 dark:bg-slate-800" />

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={firstname}
                      onChange={(e) => { setFirstname(e.target.value); setProfileDirty(true); }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm input-focus transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={lastname}
                      onChange={(e) => { setLastname(e.target.value); setProfileDirty(true); }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm input-focus transition-colors"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setProfileDirty(true); }}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm input-focus transition-colors"
                    />
                  </div>
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Private Profile</div>
                    <div className="text-xs text-gray-400 dark:text-slate-500">Hide your profile from other users</div>
                  </div>
                  <button
                    onClick={() => { setIsPrivate(!isPrivate); setProfileDirty(true); }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      isPrivate ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        isPrivate ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleProfileSave}
                  disabled={!hasProfileChanges || profileSaving}
                  className="w-full btn-primary py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {profileSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {tab === 'security' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Change Password</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Enter your current password and choose a new one.
                  </p>
                </div>

                {/* Current Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm input-focus transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-slate-800" />

                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm input-focus transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicators */}
                  {newPassword.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {passwordChecks.map((check) => (
                        <div key={check.label} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            check.met
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600'
                          }`}>
                            <Check className="w-2.5 h-2.5" />
                          </div>
                          <span className={`text-xs ${
                            check.met
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-gray-400 dark:text-slate-500'
                          }`}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm input-focus transition-colors ${
                        confirmPassword.length > 0 && !passwordsMatch
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-gray-200 dark:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
                  )}
                </div>

                {/* Change Password Button */}
                <button
                  onClick={handlePasswordChange}
                  disabled={!canChangePassword}
                  className="w-full btn-primary py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {passwordSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {passwordSaving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

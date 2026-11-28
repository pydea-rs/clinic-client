import React, { useState, useEffect, useCallback } from 'react';
import { schedulingApi } from '../../api';
import toast from 'react-hot-toast';
import { DoctorAvailability } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';

export const AvailabilityPanel: React.FC<{ doctorId?: number }> = ({ doctorId }) => {
  const [availability, setAvailability] = useState<DoctorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    isActive: true,
  });

  const loadAvailability = useCallback(async (isCancelled?: () => boolean) => {
    try {
      const data = await schedulingApi.getAvailability(doctorId);
      if (!isCancelled?.()) setAvailability(data);
    } catch (error: unknown) {
      if (!isCancelled?.()) toast.error(getErrorMessage(error, 'Failed to load availability'));
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadAvailability(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId !== null) {
        await schedulingApi.updateAvailability(editingId, formData, doctorId);
        toast.success('Availability updated');
      } else {
        await schedulingApi.createAvailability(formData, doctorId);
        toast.success('Availability created');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      });
      loadAvailability();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save availability'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this availability?')) {
      return;
    }
    try {
      await schedulingApi.deleteAvailability(id, doctorId);
      toast.success('Availability deleted');
      loadAvailability();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete availability'));
    }
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="shimmer h-8 w-44" />
        <div className="shimmer h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Availability</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 btn-primary"
        >
          Add Availability
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6 animate-scale-in">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{editingId !== null ? 'Edit' : 'Create'} Availability</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Day of Week</label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                className="w-full px-4 py-2 input-focus"
              >
                {days.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 input-focus"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 input-focus"
                  required
                />
              </div>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-gray-700 dark:text-slate-300">Active</span>
            </label>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 btn-primary py-2"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {availability.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-slate-400">No availability set</p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {availability.map((item) => (
            <div key={item.id} className="card card-hover p-6 animate-slide-in-up">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{days[item.dayOfWeek]}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {item.startTime} - {item.endTime} UTC
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`badge ${item.isActive ? 'badge-green' : 'badge-gray'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => {
                      setFormData({
                        dayOfWeek: item.dayOfWeek,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        isActive: item.isActive,
                      });
                      setEditingId(item.id);
                      setShowForm(true);
                    }}
                    className="px-3 py-1 text-sm text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

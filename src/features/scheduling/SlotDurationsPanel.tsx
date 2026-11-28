import React, { useState, useEffect, useCallback } from 'react';
import { schedulingApi } from '../../api';
import toast from 'react-hot-toast';
import { SlotDuration } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';

export const SlotDurationsPanel: React.FC<{ doctorId?: number }> = ({ doctorId }) => {
  const [durations, setDurations] = useState<SlotDuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    minutes: 30,
    price: '50.00',
    label: '',
    isActive: true,
  });

  const loadDurations = useCallback(async (isCancelled?: () => boolean) => {
    try {
      const data = await schedulingApi.getSlotDurations(doctorId);
      if (!isCancelled?.()) setDurations(data);
    } catch (error: unknown) {
      if (!isCancelled?.()) toast.error(getErrorMessage(error, 'Failed to load durations'));
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadDurations(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadDurations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await schedulingApi.createSlotDuration({
        minutes: formData.minutes,
        price: Number(formData.price),
        label: formData.label || undefined,
        isActive: formData.isActive,
      }, doctorId);
      toast.success('Duration created');
      setShowForm(false);
      setFormData({ minutes: 30, price: '50.00', label: '', isActive: true });
      loadDurations();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save duration'));
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Slot Durations</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 btn-primary"
        >
          Add Duration
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6 animate-scale-in">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Duration</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Minutes</label>
              <input
                type="number"
                value={formData.minutes}
                onChange={(e) => setFormData({ ...formData, minutes: Number(e.target.value) })}
                className="w-full px-4 py-2 input-focus"
                min={15}
                step={15}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Price ($)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 input-focus"
                min={0}
                step={0.01}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Label (Optional)</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-4 py-2 input-focus"
                placeholder="e.g., 30-min standard"
              />
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
                onClick={() => setShowForm(false)}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {durations.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-slate-400">No durations set</p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {durations.map((item) => (
            <div key={item.id} className="card card-hover p-6 animate-slide-in-up">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{item.minutes} minutes</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">${item.price}</p>
                  {item.label && <p className="text-sm text-gray-500 dark:text-slate-400">{item.label}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`badge ${item.isActive ? 'badge-green' : 'badge-gray'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

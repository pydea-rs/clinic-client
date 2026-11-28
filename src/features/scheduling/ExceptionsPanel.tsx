import React, { useState, useEffect, useCallback } from 'react';
import { schedulingApi } from '../../api';
import toast from 'react-hot-toast';
import { AvailabilityException } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';

export const ExceptionsPanel: React.FC<{ doctorId?: number }> = ({ doctorId }) => {
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    isBlocked: true,
    startTime: '',
    endTime: '',
    reason: '',
  });

  const loadExceptions = useCallback(async (isCancelled?: () => boolean) => {
    try {
      const data = await schedulingApi.getExceptions(doctorId);
      if (!isCancelled?.()) setExceptions(data);
    } catch (error: unknown) {
      if (!isCancelled?.()) toast.error(getErrorMessage(error, 'Failed to load exceptions'));
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadExceptions(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadExceptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await schedulingApi.createException({
        date: formData.date,
        isBlocked: formData.isBlocked,
        startTime: formData.isBlocked ? undefined : (formData.startTime || undefined),
        endTime: formData.isBlocked ? undefined : (formData.endTime || undefined),
        reason: formData.reason || undefined,
      }, doctorId);
      toast.success('Exception created');
      setShowForm(false);
      setFormData({ date: new Date().toISOString().split('T')[0], isBlocked: true, startTime: '', endTime: '', reason: '' });
      loadExceptions();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save exception'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this exception?')) {
      return;
    }
    try {
      await schedulingApi.deleteException(id, doctorId);
      toast.success('Exception deleted');
      loadExceptions();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete exception'));
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="shimmer h-8 w-52" />
        <div className="shimmer h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Availability Exceptions</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 btn-primary"
        >
          Add Exception
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6 animate-scale-in">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Exception</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 input-focus"
                required
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="exceptionType"
                  checked={formData.isBlocked}
                  onChange={() => setFormData({ ...formData, isBlocked: true })}
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-slate-300">Block entire day</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="exceptionType"
                  checked={!formData.isBlocked}
                  onChange={() => setFormData({ ...formData, isBlocked: false })}
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-slate-300">Partial override</span>
              </label>
            </div>

            {!formData.isBlocked && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 input-focus"
                    required={!formData.isBlocked}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 input-focus"
                    required={!formData.isBlocked}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 input-focus"
                rows={2}
              />
            </div>

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

      {exceptions.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-slate-400">No exceptions set</p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {exceptions.map((item) => (
            <div key={item.id} className="card card-hover p-6 animate-slide-in-up">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{item.date.split('T')[0]}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {item.isBlocked ? 'Day blocked' : `${item.startTime} - ${item.endTime} UTC`}
                  </p>
                  {item.reason && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{item.reason}</p>}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

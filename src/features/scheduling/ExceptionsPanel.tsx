import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../api/scheduling.api';
import toast from 'react-hot-toast';

export const ExceptionsPanel: React.FC = () => {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    isBlocked: true,
    startTime: '',
    endTime: '',
    reason: '',
  });

  useEffect(() => {
    loadExceptions();
  }, []);

  const loadExceptions = async () => {
    try {
      const data = await schedulingApi.getExceptions();
      setExceptions(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load exceptions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await schedulingApi.createException(formData);
      toast.success('Exception created');
      setShowForm(false);
      loadExceptions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save exception');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this exception?')) {
      return;
    }
    try {
      await schedulingApi.deleteException(id);
      toast.success('Exception deleted');
      loadExceptions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete exception');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Availability Exceptions</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Exception
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Create Exception</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="exceptionType"
                  checked={formData.isBlocked}
                  onChange={() => setFormData({ ...formData, isBlocked: true })}
                  className="rounded"
                />
                <span className="text-gray-700">Block entire day</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="exceptionType"
                  checked={!formData.isBlocked}
                  onChange={() => setFormData({ ...formData, isBlocked: false })}
                  className="rounded"
                />
                <span className="text-gray-700">Partial override</span>
              </label>
            </div>

            {!formData.isBlocked && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required={!formData.isBlocked}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required={!formData.isBlocked}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                rows={2}
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {exceptions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No exceptions set</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exceptions.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{item.date}</h3>
                  <p className="text-sm text-gray-500">
                    {item.isBlocked ? 'Day blocked' : `${item.startTime} - ${item.endTime}`}
                  </p>
                  {item.reason && <p className="text-sm text-gray-400 mt-1">{item.reason}</p>}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-1 text-red-600 hover:underline"
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

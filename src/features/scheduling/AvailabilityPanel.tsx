import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../api/scheduling.api';
import toast from 'react-hot-toast';

export const AvailabilityPanel: React.FC = () => {
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    isActive: true,
  });

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const data = await schedulingApi.getAvailability();
      setAvailability(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await schedulingApi.updateAvailability(formData);
        toast.success('Availability updated');
      } else {
        await schedulingApi.createAvailability(formData);
        toast.success('Availability created');
      }
      setShowForm(false);
      loadAvailability();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save availability');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this availability?')) {
      return;
    }
    try {
      await schedulingApi.deleteAvailability(id);
      toast.success('Availability deleted');
      loadAvailability();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete availability');
    }
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Availability</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Availability
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{formData.id ? 'Edit' : 'Create'} Availability</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                {days.map((day, index) => (
                  <option key={day} value={index + 1}>{day}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-gray-700">Active</span>
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

      {availability.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No availability set</p>
        </div>
      ) : (
        <div className="space-y-4">
          {availability.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{days[item.dayOfWeek - 1]}</h3>
                  <p className="text-sm text-gray-500">
                    {item.startTime} - {item.endTime}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => {
                      setFormData(item);
                      setShowForm(true);
                    }}
                    className="px-3 py-1 text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1 text-red-600 hover:underline"
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

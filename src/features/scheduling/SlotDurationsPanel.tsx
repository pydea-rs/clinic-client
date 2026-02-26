import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../api/scheduling.api';
import toast from 'react-hot-toast';

export const SlotDurationsPanel: React.FC = () => {
  const [durations, setDurations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    minutes: 30,
    price: '50.00',
    label: '',
    isActive: true,
  });

  useEffect(() => {
    loadDurations();
  }, []);

  const loadDurations = async () => {
    try {
      const data = await schedulingApi.getSlotDurations();
      setDurations(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load durations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await schedulingApi.updateSlotDuration(formData);
        toast.success('Duration updated');
      } else {
        await schedulingApi.createSlotDuration(formData);
        toast.success('Duration created');
      }
      setShowForm(false);
      loadDurations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save duration');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this duration?')) {
      return;
    }
    try {
      await schedulingApi.deleteSlotDuration(id);
      toast.success('Duration deleted');
      loadDurations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete duration');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Slot Durations</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Duration
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{formData.id ? 'Edit' : 'Create'} Duration</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minutes</label>
              <input
                type="number"
                value={formData.minutes}
                onChange={(e) => setFormData({ ...formData, minutes: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
                min={15}
                step={15}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                min={0}
                step={0.01}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Label (Optional)</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., 30-min standard"
              />
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

      {durations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No durations set</p>
        </div>
      ) : (
        <div className="space-y-4">
          {durations.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{item.minutes} minutes</h3>
                  <p className="text-sm text-gray-500">${item.price}</p>
                  {item.label && <p className="text-sm text-gray-400">{item.label}</p>}
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

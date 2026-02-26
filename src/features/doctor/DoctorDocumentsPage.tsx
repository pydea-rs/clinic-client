import React, { useState, useEffect } from 'react';
import { doctorApi } from '../../api/doctor.api';
import toast from 'react-hot-toast';

export const DoctorDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<'LICENSE' | 'ID_CARD' | 'CERTIFICATION' | 'PHOTO' | 'OTHER'>('LICENSE');

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const data = await doctorApi.getDocuments();
        setDocuments(data || []);
      } catch (error) {
        console.error('Failed to load documents:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      await doctorApi.uploadDocument(selectedFile, selectedType);
      toast.success('Document uploaded successfully');
      setSelectedFile(null);
      const data = await doctorApi.getDocuments();
      setDocuments(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Doctor Documents</h1>
      
      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-bold mb-4">Upload Document</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="LICENSE">Medical License</option>
              <option value="ID_CARD">Government ID</option>
              <option value="CERTIFICATION">Specialty Certification</option>
              <option value="PHOTO">Profile Photo</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          {selectedFile && (
            <div className="text-sm text-gray-500">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium capitalize">{doc.type.replace('_', ' ')}</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    doc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    doc.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {doc.status}
                  </span>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

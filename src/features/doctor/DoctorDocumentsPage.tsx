import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../../api/doctor.api';
import { Loader2, Upload, FileText, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DOCUMENT_TYPES = [
  'LICENSE',
  'DEGREE',
  'CERTIFICATION',
  'INSURANCE',
  'MALPRACTICE_INSURANCE',
  'OTHER',
];

export const DoctorDocumentsPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState('LICENSE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['doctor-documents'],
    queryFn: () => doctorApi.getDocuments(),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => doctorApi.uploadDocument(file, selectedType),
    onSuccess: () => {
      toast.success('Document uploaded successfully');
      setSelectedFile(null);
      setSelectedType('LICENSE');
      queryClient.invalidateQueries({ queryKey: ['doctor-documents'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload document');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => doctorApi.deleteDocument(documentId),
    onSuccess: () => {
      toast.success('Document deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['doctor-documents'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (PDF, images)
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a PDF or image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await uploadMutation.mutateAsync(selectedFile);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      PENDING: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: <Clock className="w-4 h-4" />,
      },
      APPROVED: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: <CheckCircle className="w-4 h-4" />,
      },
      REJECTED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: <XCircle className="w-4 h-4" />,
      },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {status}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Verification Documents</h1>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Document</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type *</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select File *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium mb-1">
                  {selectedFile ? selectedFile.name : 'Click to select or drag and drop'}
                </p>
                <p className="text-sm text-gray-500">PDF or image (max 10MB)</p>
              </label>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium flex items-center justify-center gap-2"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Document
              </>
            )}
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-8 py-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Your Documents</h2>
        </div>

        {documents && documents.length === 0 ? (
          <div className="px-8 py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {documents?.map((doc) => (
              <div key={doc.id} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4 flex-1">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{doc.type.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600">
                      Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                    {doc.rejectionReason && (
                      <p className="text-sm text-red-600 mt-1">Reason: {doc.rejectionReason}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {getStatusBadge(doc.status)}
                  <button
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">Document Requirements</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Medical license (required)</li>
          <li>• Educational degree (required)</li>
          <li>• Professional certifications</li>
          <li>• Insurance documentation</li>
          <li>• All documents must be clear and legible</li>
        </ul>
      </div>
    </div>
  );
};

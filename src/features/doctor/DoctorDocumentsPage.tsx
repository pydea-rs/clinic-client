import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../../api/doctor.api';
import { Loader2, Upload, FileText, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';

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
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to upload document'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => doctorApi.deleteDocument(documentId),
    onSuccess: () => {
      toast.success('Document deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['doctor-documents'] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to delete document'));
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
    const badges: Record<string, { className: string; icon: React.ReactNode }> = {
      PENDING: {
        className: 'badge-yellow',
        icon: <Clock className="w-3.5 h-3.5" />,
      },
      APPROVED: {
        className: 'badge-green',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      },
      REJECTED: {
        className: 'badge-red',
        icon: <XCircle className="w-3.5 h-3.5" />,
      },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <div className={`badge ${badge.className}`}>
        {badge.icon}
        {status}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-soft">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Verification Documents</h1>
      </div>

      {/* Upload Section */}
      <div className="card p-8 mb-8 animate-slide-in-up">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Document</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type *</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 input-focus"
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
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-brand-400 transition-all duration-300 hover:bg-brand-50/30">
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
            className="btn-primary w-full px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="card overflow-hidden animate-slide-in-up" style={{ animationDelay: '50ms' }}>
        <div className="px-8 py-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Your Documents</h2>
        </div>

        {documents && documents.length === 0 ? (
          <div className="px-8 py-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {documents?.map((doc) => (
              <div key={doc.id} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50/80 transition-colors duration-200">
                <div className="flex items-center gap-4 flex-1">
                  <FileText className="w-8 h-8 text-brand-600" />
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
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 hover:scale-105"
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
      <div className="card mt-8 p-6 border-brand-100 bg-brand-50/30 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
        <h3 className="font-bold text-brand-900 mb-2">Document Requirements</h3>
        <ul className="text-sm text-brand-800 space-y-1">
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

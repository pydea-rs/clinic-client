import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '../../api/patient.api';
import { Loader2, FileText, Calendar, Tag } from 'lucide-react';

export const SOAPDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: soap, isLoading, error } = useQuery({
    queryKey: ['soap', id],
    queryFn: () => patientApi.getSOAPDetail(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !soap) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">SOAP Note Not Found</h2>
          <p className="text-gray-600">The SOAP note you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-8 h-8" />
              <h1 className="text-3xl font-bold">SOAP Note</h1>
            </div>
            <p className="text-blue-100">
              <Calendar className="w-4 h-4 inline mr-2" />
              {formatDate(soap.createdAt)}
            </p>
          </div>
          {soap.specialty && (
            <div className="text-right">
              <p className="text-blue-100 text-sm mb-2">Specialty</p>
              <p className="text-xl font-semibold">{soap.specialty}</p>
            </div>
          )}
        </div>
      </div>

      {/* SOAP Sections */}
      <div className="space-y-6">
        {/* Subjective */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Subjective</h2>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{soap.subjective}</p>
        </div>

        {/* Objective */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Objective</h2>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{soap.objective}</p>
        </div>

        {/* Assessment */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Assessment</h2>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{soap.assessment}</p>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-600">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Plan</h2>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{soap.plan}</p>
        </div>

        {/* Triage */}
        {soap.triage && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Triage</h2>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{soap.triage}</p>
          </div>
        )}

        {/* Raw Note */}
        {soap.rawNote && (
          <div className="bg-gray-50 rounded-lg shadow p-6 border-l-4 border-gray-400">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Raw Note</h2>
            <pre className="text-sm text-gray-700 overflow-x-auto bg-white p-4 rounded border">
              {soap.rawNote}
            </pre>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6 text-sm text-gray-600">
        <p>
          <span className="font-medium">Conversation ID:</span> {soap.conversationId}
        </p>
        {soap.doctorId && (
          <p>
            <span className="font-medium">Doctor ID:</span> {soap.doctorId}
          </p>
        )}
        <p>
          <span className="font-medium">Last Updated:</span> {formatDate(soap.updatedAt)}
        </p>
      </div>
    </div>
  );
};

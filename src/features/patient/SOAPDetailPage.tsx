import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { patientApi } from '../../api/patient.api';
import { Loader2, FileText, Calendar, Tag, AlertTriangle } from 'lucide-react';

const mdComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  ul: ({ children }: any) => <ul className="mb-2 last:mb-0 ml-4 space-y-0.5 list-disc">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2 last:mb-0 ml-4 space-y-0.5 list-decimal">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
};

export const SOAPDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: soap, isLoading, error } = useQuery({
    queryKey: ['soap', id],
    queryFn: () => {
      if (!id) {
        throw new Error('SOAP ID is required');
      }
      return patientApi.getSOAPDetail(id);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
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
      <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-purple-500 text-white rounded-2xl shadow-soft-xl p-8 mb-8 animate-slide-in-up">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-8 h-8 drop-shadow-md" />
              <h1 className="text-3xl font-bold">SOAP Note</h1>
            </div>
            <p className="text-white/80">
              <Calendar className="w-4 h-4 inline mr-2" />
              {formatDate(soap.createdAt)}
            </p>
          </div>
          {soap.specialty && (
            <div className="text-right">
              <p className="text-white/70 text-sm mb-2">Specialty</p>
              <p className="text-xl font-semibold">{soap.specialty}</p>
            </div>
          )}
        </div>
      </div>

      {/* Overall Container with glow */}
      <div className="card-glow rounded-2xl p-1">
        <div className="bg-white rounded-2xl">
          {/* SOAP Sections */}
          <div className="space-y-6 p-6">
            {/* Subjective */}
            <div className="card p-6 border-l-4 border-blue-400 animate-slide-in-up" style={{ animationDelay: '80ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900">Subjective</h2>
              </div>
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
                {soap.subjective ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{soap.subjective}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">No data available</p>
                )}
              </div>
            </div>

            {/* Objective */}
            <div className="card p-6 border-l-4 border-emerald-400 animate-slide-in-up" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-emerald-500" />
                <h2 className="text-xl font-bold text-gray-900">Objective</h2>
              </div>
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
                {soap.objective ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{soap.objective}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">No data available</p>
                )}
              </div>
            </div>

            {/* Assessment */}
            <div className="card p-6 border-l-4 border-amber-400 animate-slide-in-up" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-900">Assessment</h2>
              </div>
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
                {soap.assessment ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{soap.assessment}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">No data available</p>
                )}
              </div>
            </div>

            {/* Plan */}
            <div className="card p-6 border-l-4 border-purple-400 animate-slide-in-up" style={{ animationDelay: '320ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-purple-500" />
                <h2 className="text-xl font-bold text-gray-900">Plan</h2>
              </div>
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
                {soap.plan ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{soap.plan}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">No data available</p>
                )}
              </div>
            </div>

            {/* Triage */}
            {soap.triage && (
              <div className="card p-6 border-l-4 border-red-500 animate-slide-in-up" style={{ animationDelay: '400ms' }}>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h2 className="text-2xl font-bold text-gray-900">Triage</h2>
                  <span className="badge badge-red text-base font-semibold px-4 py-1.5">Priority Assessment</span>
                </div>
                <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{soap.triage}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Raw Note */}
            {soap.rawNote && (
              <div className="card bg-gray-50 p-6 border-l-4 border-gray-400 animate-slide-in-up" style={{ animationDelay: '480ms' }}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Raw Note</h2>
                <pre className="text-sm text-gray-700 overflow-x-auto bg-white p-4 rounded border">
                  {soap.rawNote}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-8 card bg-gray-50/50 p-6 text-sm text-gray-600 animate-fade-in" style={{ animationDelay: '500ms' }}>
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

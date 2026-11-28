import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '../../api';
import { Link } from 'react-router-dom';
import { Loader2, ChevronRight, FileText } from 'lucide-react';
import { formatSpecialty, formatTriageLevel } from '../../lib/format';

const stripMarkdown = (text: string) =>
  text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/_(.*?)_/g, '$1');

export const PatientSOAPListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['soaps', page],
    queryFn: () => patientApi.getSOAPs(page, limit),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8 animate-slide-in-up">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-soft">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold gradient-text">My SOAP Notes</h1>
      </div>

      {/* SOAP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
        {data?.soaps.map((soap) => (
          <Link
            key={soap.id}
            to={`/soap/${soap.id}`}
            className="card-interactive card-shine group p-6 border-l-4 border-brand-500 hover:border-brand-600 animate-slide-in-up"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">SOAP Note</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {new Date(soap.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all duration-200" />
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {soap.suggestedSpecialty && (
                <span className="badge badge-blue">
                  {formatSpecialty(soap.suggestedSpecialty)}
                </span>
              )}
              {soap.triageLevel && (
                <span className={`badge ${soap.triageLevel === 'EMERGENCY' || soap.triageLevel === 'URGENT' ? 'badge-red' : 'badge-gray'}`}>
                  {formatTriageLevel(soap.triageLevel)}
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm">
              {soap.subjective && (
                <div>
                  <p className="text-gray-600 dark:text-slate-300">
                    <span className="font-medium">Subjective:</span> {stripMarkdown(soap.subjective).substring(0, 100)}{stripMarkdown(soap.subjective).length > 100 ? '...' : ''}
                  </p>
                </div>
              )}
              {soap.assessment && (
                <div>
                  <p className="text-gray-600 dark:text-slate-300">
                    <span className="font-medium">Assessment:</span> {stripMarkdown(soap.assessment).substring(0, 100)}{stripMarkdown(soap.assessment).length > 100 ? '...' : ''}
                  </p>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {data?.soaps.length === 0 && (
        <div className="card text-center py-12 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 animate-float">
            <FileText className="w-8 h-8 text-gray-400 dark:text-slate-500" />
          </div>
          <p className="text-gray-600 dark:text-slate-300 font-medium">No SOAP notes yet</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 mb-5">Start an AI symptom consultation to generate a structured clinical summary.</p>
          <Link to="/ai/new" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm">
            Start AI Chat
          </Link>
        </div>
      )}

      {/* Pagination */}
      {data && data.soaps.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '../../api/patient.api';
import { Link } from 'react-router-dom';
import { Loader2, ChevronRight, FileText } from 'lucide-react';

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
      <div className="flex items-center justify-center min-h-screen">
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
            className="card-interactive group p-6 border-l-4 border-brand-500 hover:border-brand-600 animate-slide-in-up"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">SOAP Note</h3>
                <p className="text-sm text-gray-600">
                  {new Date(soap.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
            </div>

            {soap.specialty && (
              <div className="mb-3">
                <span className="badge badge-blue">
                  {soap.specialty}
                </span>
              </div>
            )}

            <div className="space-y-2 text-sm">
              {soap.subjective && (
                <div>
                  <p className="text-gray-600">
                    <span className="font-medium">Subjective:</span> {stripMarkdown(soap.subjective).substring(0, 100)}{stripMarkdown(soap.subjective).length > 100 ? '...' : ''}
                  </p>
                </div>
              )}
              {soap.assessment && (
                <div>
                  <p className="text-gray-600">
                    <span className="font-medium">Assessment:</span> {stripMarkdown(soap.assessment).substring(0, 100)}{stripMarkdown(soap.assessment).length > 100 ? '...' : ''}
                  </p>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {data?.soaps.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No SOAP notes yet</p>
        </div>
      )}

      {/* Pagination */}
      {data && data.soaps.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-gray-600">
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
            <span className="px-3 py-1 text-sm text-gray-600">
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

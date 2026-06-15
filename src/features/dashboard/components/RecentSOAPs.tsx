import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { soapApi } from '../../../api/soap.api';
import { FileText, Search, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const triageBadge: Record<string, { color: string; icon: React.ReactNode }> = {
  SELF_CARE: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  SEE_DOCTOR: { color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="w-3 h-3" /> },
  URGENT: { color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="w-3 h-3" /> },
  EMERGENCY: { color: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
};

export const RecentSOAPs: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['soaps-recent', { take: 3 }],
    queryFn: () => soapApi.list({ take: 3 }),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent SOAP Notes</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const soaps = data?.data || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Recent SOAP Notes</h3>
        <Link to="/patient/soaps" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all
        </Link>
      </div>

      {soaps.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No SOAP notes yet</p>
          <p className="text-xs text-gray-400 mt-1">Chat with AI to generate one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {soaps.map((soap) => {
            const triage = soap.triageLevel ? triageBadge[soap.triageLevel] : null;
            return (
              <div key={soap.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {triage && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${triage.color}`}>
                      {triage.icon}
                      {soap.triageLevel?.replace(/_/g, ' ')}
                    </span>
                  )}
                  {soap.suggestedSpecialty && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      {soap.suggestedSpecialty.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(soap.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {soap.assessment && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{soap.assessment}</p>
                )}
                <div className="flex gap-2">
                  <Link
                    to={`/doctors?specialty=${soap.suggestedSpecialty || ''}&soapId=${soap.id}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Search className="w-3 h-3" />
                    Find Doctor
                  </Link>
                  <Link
                    to={`/soap/${soap.id}`}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    <FileText className="w-3 h-3" />
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

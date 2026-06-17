import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { soapApi } from '../../../api/soap.api';
import { FileText, Search, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const triageBadge: Record<string, { color: string; icon: React.ReactNode }> = {
  SELF_CARE: { color: 'bg-emerald-50 text-emerald-600', icon: <CheckCircle className="w-3 h-3" /> },
  SEE_DOCTOR: { color: 'bg-yellow-50 text-yellow-600', icon: <AlertTriangle className="w-3 h-3" /> },
  URGENT: { color: 'bg-orange-50 text-orange-600', icon: <AlertCircle className="w-3 h-3" /> },
  EMERGENCY: { color: 'bg-red-50 text-red-600', icon: <AlertCircle className="w-3 h-3" /> },
};

export const RecentSOAPs: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['soaps-recent', { take: 3 }],
    queryFn: () => soapApi.list({ take: 3 }),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-medium text-sm text-gray-900 mb-3">Recent SOAP Notes</h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const soaps = data?.data || [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-gray-900">Recent SOAP Notes</h3>
        <Link to="/patient/soaps" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          View all
        </Link>
      </div>

      {soaps.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No SOAP notes yet</p>
          <p className="text-[11px] text-gray-300 mt-0.5">Chat with AI to generate one</p>
        </div>
      ) : (
        <div className="space-y-2">
          {soaps.map((soap) => {
            const triage = soap.triageLevel ? triageBadge[soap.triageLevel] : null;
            return (
              <div key={soap.id} className="p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {triage && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${triage.color}`}>
                      {triage.icon}
                      {soap.triageLevel?.replace(/_/g, ' ')}
                    </span>
                  )}
                  {soap.suggestedSpecialty && (
                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-medium">
                      {soap.suggestedSpecialty.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 ml-auto">
                    {new Date(soap.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {soap.assessment && (
                  <div className="text-xs text-gray-500 line-clamp-2 mb-2 [&_p]:mb-0 [&_strong]:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }: any) => <span>{children}</span> }}>{soap.assessment}</ReactMarkdown>
                  </div>
                )}
                <div className="flex gap-3">
                  <Link
                    to={`/doctors?specialty=${soap.suggestedSpecialty || ''}&soapId=${soap.id}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Search className="w-3 h-3" />
                    Find Doctor
                  </Link>
                  <Link
                    to={`/soap/${soap.id}`}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    Details
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

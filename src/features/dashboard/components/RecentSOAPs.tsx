import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { soapApi } from '../../../api/soap.api';
import { FileText, Search, AlertTriangle, CheckCircle, AlertCircle, ClipboardList } from 'lucide-react';

const triageBadge: Record<string, { color: string; ring: string; icon: React.ReactNode }> = {
  SELF_CARE: { color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-500/10', icon: <CheckCircle className="w-3 h-3" /> },
  SEE_DOCTOR: { color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-500/10', icon: <AlertTriangle className="w-3 h-3" /> },
  URGENT: { color: 'bg-orange-50 text-orange-700', ring: 'ring-orange-500/10', icon: <AlertCircle className="w-3 h-3" /> },
  EMERGENCY: { color: 'bg-red-50 text-red-700', ring: 'ring-red-500/10', icon: <AlertCircle className="w-3 h-3" /> },
};

export const RecentSOAPs: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['soaps-recent', { take: 3 }],
    queryFn: () => soapApi.list({ take: 3 }),
  });

  if (isLoading) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Recent SOAP Notes</h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const soaps = data?.data || [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-gray-900">Recent SOAP Notes</h3>
        </div>
        <Link to="/patient/soaps" className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors">
          View all
        </Link>
      </div>

      {soaps.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400 mb-0.5">No SOAP notes yet</p>
          <p className="text-xs text-gray-300">Chat with AI to generate one</p>
        </div>
      ) : (
        <div className="space-y-2">
          {soaps.map((soap) => {
            const triage = soap.triageLevel ? triageBadge[soap.triageLevel] : null;
            return (
              <div key={soap.id} className="p-3.5 border border-gray-100 rounded-xl hover:border-gray-200 hover:bg-gray-50/50 transition-all duration-200 group">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {triage && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ring-1 ${triage.color} ${triage.ring}`}>
                      {triage.icon}
                      {soap.triageLevel?.replace(/_/g, ' ')}
                    </span>
                  )}
                  {soap.suggestedSpecialty && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-semibold ring-1 ring-purple-600/10">
                      {soap.suggestedSpecialty.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 ml-auto">
                    {new Date(soap.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {soap.assessment && (
                  <div className="text-xs text-gray-500 line-clamp-2 mb-2.5 leading-relaxed [&_p]:mb-0 [&_strong]:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }: any) => <span>{children}</span> }}>{soap.assessment}</ReactMarkdown>
                  </div>
                )}
                <div className="flex gap-3">
                  <Link
                    to={`/doctors?specialty=${soap.suggestedSpecialty || ''}&soapId=${soap.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                  >
                    <Search className="w-3 h-3" />
                    Find Doctor
                  </Link>
                  <Link
                    to={`/soap/${soap.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-semibold transition-colors"
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

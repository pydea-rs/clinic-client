import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Search, X, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { formatSpecialty } from '../../../lib/format';

interface SOAPReadyBannerProps {
  soapId: string;
  assessment?: string;
  suggestedSpecialty?: string | null;
  triageLevel?: string | null;
  onFindDoctor: () => void;
  onViewSOAP: () => void;
  onDismiss: () => void;
}

const triageConfig: Record<string, { color: string; bg: string; ring: string; icon: React.ReactNode; label: string }> = {
  SELF_CARE: { color: 'text-green-700', bg: 'bg-green-50', ring: 'ring-green-600/10', icon: <CheckCircle className="w-4 h-4 text-green-600" />, label: 'Self Care' },
  SEE_DOCTOR: { color: 'text-yellow-700', bg: 'bg-yellow-50', ring: 'ring-yellow-600/10', icon: <AlertTriangle className="w-4 h-4 text-yellow-600" />, label: 'See a Doctor' },
  URGENT: { color: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-orange-600/10', icon: <AlertCircle className="w-4 h-4 text-orange-600" />, label: 'Urgent' },
  EMERGENCY: { color: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-600/10', icon: <AlertCircle className="w-4 h-4 text-red-600" />, label: 'Emergency' },
};

export const SOAPReadyBanner: React.FC<SOAPReadyBannerProps> = ({
  assessment,
  suggestedSpecialty,
  triageLevel,
  onFindDoctor,
  onViewSOAP,
  onDismiss,
}) => {
  const triage = triageLevel ? triageConfig[triageLevel] : null;

  return (
    <div className="flex-shrink-0 border-t border-brand-100/50 bg-gradient-to-r from-brand-50/80 to-brand-100/40 glass px-4 py-3.5 animate-slide-in-up">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-500/20">
              <FileText className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm">SOAP Note Generated</h4>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {triage && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${triage.bg} ${triage.color} ring-1 ${triage.ring}`}>
                    {triage.icon}
                    {triage.label}
                  </span>
                )}
                {suggestedSpecialty && (
                  <span className="badge-purple">
                    {formatSpecialty(suggestedSpecialty)}
                  </span>
                )}
              </div>
              {assessment && (
                <div className="text-xs text-gray-500 mt-1.5 line-clamp-2 [&_p]:mb-0 [&_strong]:font-semibold leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }: any) => <span>{children}</span> }}>{assessment}</ReactMarkdown>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onFindDoctor}
                  className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  Find a Doctor
                </button>
                <button
                  onClick={onViewSOAP}
                  className="btn-secondary flex items-center gap-1.5 px-4 py-2 text-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View SOAP
                </button>
              </div>
            </div>
          </div>
          <button onClick={onDismiss} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg flex-shrink-0 transition-all duration-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

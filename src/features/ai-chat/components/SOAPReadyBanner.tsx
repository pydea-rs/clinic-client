import React from 'react';
import { FileText, Search, X, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface SOAPReadyBannerProps {
  soapId: string;
  assessment?: string;
  suggestedSpecialty?: string | null;
  triageLevel?: string | null;
  onFindDoctor: () => void;
  onViewSOAP: () => void;
  onDismiss: () => void;
}

const triageConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  SELF_CARE: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: <CheckCircle className="w-5 h-5 text-green-600" />, label: 'Self Care' },
  SEE_DOCTOR: { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />, label: 'See a Doctor' },
  URGENT: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: <AlertCircle className="w-5 h-5 text-orange-600" />, label: 'Urgent' },
  EMERGENCY: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: <AlertCircle className="w-5 h-5 text-red-600" />, label: 'Emergency' },
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
    <div className="mx-4 mb-2 p-4 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm animate-slide-in-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm">SOAP Note Generated</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {triage && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${triage.bg} ${triage.color} ${triage.border} border`}>
                  {triage.icon}
                  {triage.label}
                </span>
              )}
              {suggestedSpecialty && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {suggestedSpecialty.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            {assessment && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{assessment}</p>
            )}
          </div>
        </div>
        <button onClick={onDismiss} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mt-3 ml-13">
        <button
          onClick={onFindDoctor}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          Find a Doctor
        </button>
        <button
          onClick={onViewSOAP}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <FileText className="w-4 h-4" />
          View SOAP
        </button>
      </div>
    </div>
  );
};

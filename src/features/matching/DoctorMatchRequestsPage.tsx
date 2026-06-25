import React, { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { matchingApi } from '../../api/matching.api';
import { matchingSocket } from '../../lib/socket/matching.socket';
import { Loader2, UserPlus, Check, X, Clock, FileText, AlertTriangle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { MatchRequest, TriageLevel } from '../../lib/types/api';
import { formatSpecialty } from '../../lib/format';

const triageConfig: Record<string, { icon: React.ElementType; color: string; ring: string; label: string }> = {
  SELF_CARE: { icon: Check, color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-500/10', label: 'Self Care' },
  SEE_DOCTOR: { icon: AlertTriangle, color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-500/10', label: 'See Doctor' },
  URGENT: { icon: AlertTriangle, color: 'bg-orange-50 text-orange-700', ring: 'ring-orange-500/10', label: 'Urgent' },
  EMERGENCY: { icon: AlertTriangle, color: 'bg-red-50 text-red-700', ring: 'ring-red-500/10', label: 'Emergency' },
};

const TriageBadge: React.FC<{ level?: TriageLevel }> = ({ level }) => {
  if (!level) return null;
  const config = triageConfig[level];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ring-1 ${config.color} ${config.ring}`}>
      <Icon className="w-3 h-3" /> {config.label}
    </span>
  );
};

const MatchRequestCard: React.FC<{
  request: MatchRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}> = ({ request, onAccept, onReject, isProcessing }) => {
  const elapsed = Math.floor((Date.now() - new Date(request.createdAt).getTime()) / 1000);
  const remaining = Math.max(0, 300 - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="card overflow-hidden animate-slide-in-up">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-100 to-brand-50 rounded-xl flex items-center justify-center ring-1 ring-brand-200/50">
              <UserPlus className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">New Patient Match</div>
              <div className="text-xs text-gray-500">
                {new Date(request.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-medium">{minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {request.specialty && (
            <span className="badge badge-blue">
              {formatSpecialty(request.specialty)}
            </span>
          )}
          <TriageBadge level={request.triageLevel} />
          {request.soapId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium ring-1 ring-gray-200/50">
              <FileText className="w-3 h-3" /> SOAP attached
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onAccept(request.id)}
            disabled={isProcessing}
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-semibold hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-200 btn-press shadow-sm hover:shadow-md hover:shadow-emerald-500/20"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Accept
          </button>
          <button
            onClick={() => onReject(request.id)}
            disabled={isProcessing}
            className="flex-1 btn-secondary py-2.5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export const DoctorMatchRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['matching', 'pending'],
    queryFn: matchingApi.getPending,
    refetchInterval: 10000,
  });

  const handleWsEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['matching', 'pending'] });
  }, [queryClient]);

  useEffect(() => {
    matchingSocket.connect();
    matchingSocket.on('match:request', handleWsEvent);
    matchingSocket.on('match:cancelled', handleWsEvent);
    matchingSocket.on('match:timeout', handleWsEvent);

    return () => {
      matchingSocket.off('match:request', handleWsEvent);
      matchingSocket.off('match:cancelled', handleWsEvent);
      matchingSocket.off('match:timeout', handleWsEvent);
      matchingSocket.disconnect();
    };
  }, [handleWsEvent]);

  const handleAccept = async (matchRequestId: string) => {
    setProcessingId(matchRequestId);
    try {
      matchingSocket.acceptMatch(matchRequestId);
      toast.success('Match accepted! Consultation created.');
      queryClient.invalidateQueries({ queryKey: ['matching', 'pending'] });
    } catch {
      toast.error('Failed to accept match');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (matchRequestId: string) => {
    setProcessingId(matchRequestId);
    try {
      matchingSocket.rejectMatch(matchRequestId);
      toast('Match declined');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['matching', 'pending'] });
      }, 500);
    } catch {
      toast.error('Failed to decline match');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6 animate-slide-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">Match Requests</h1>
            <p className="text-gray-500 text-sm mt-0.5">Patients looking for your expertise</p>
          </div>
        </div>
        {requests && requests.length > 0 && (
          <span className="badge badge-blue text-sm">
            {requests.length} pending
          </span>
        )}
      </div>

      {!requests || requests.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No Pending Requests</h3>
          <p className="text-gray-500 text-sm">New patient matches will appear here in real time.</p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {requests.map(request => (
            <MatchRequestCard
              key={request.id}
              request={request}
              onAccept={handleAccept}
              onReject={handleReject}
              isProcessing={processingId === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

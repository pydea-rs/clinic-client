import React, { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { matchingApi } from '../../api/matching.api';
import { matchingSocket } from '../../lib/socket/matching.socket';
import { Loader2, UserPlus, Check, X, Clock, FileText, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { MatchRequest, TriageLevel } from '../../lib/types/api';

const triageConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  SELF_CARE: { icon: Check, color: 'text-green-600 bg-green-100', label: 'Self Care' },
  SEE_DOCTOR: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100', label: 'See Doctor' },
  URGENT: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-100', label: 'Urgent' },
  EMERGENCY: { icon: AlertTriangle, color: 'text-red-600 bg-red-100', label: 'Emergency' },
};

const TriageBadge: React.FC<{ level?: TriageLevel }> = ({ level }) => {
  if (!level) return null;
  const config = triageConfig[level];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">New Patient Match</div>
              <div className="text-xs text-gray-500">
                {new Date(request.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {request.specialty && (
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
              {request.specialty.replace(/_/g, ' ')}
            </span>
          )}
          <TriageBadge level={request.triageLevel} />
          {request.soapId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              <FileText className="w-3 h-3" /> SOAP attached
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onAccept(request.id)}
            disabled={isProcessing}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Accept
          </button>
          <button
            onClick={() => onReject(request.id)}
            disabled={isProcessing}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Match Requests</h1>
          <p className="text-gray-600 text-sm mt-1">Patients looking for a doctor with your expertise</p>
        </div>
        {requests && requests.length > 0 && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {requests.length} pending
          </span>
        )}
      </div>

      {!requests || requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-1">No Pending Requests</h3>
          <p className="text-gray-500 text-sm">New patient matches will appear here in real time.</p>
        </div>
      ) : (
        <div className="space-y-4">
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

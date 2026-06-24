import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { matchingApi } from '../../api/matching.api';
import { matchingSocket } from '../../lib/socket/matching.socket';
import { Loader2, Search, CheckCircle, XCircle, Clock, UserCheck, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ScoredDoctor, MatchRequest } from '../../lib/types/api';

const MATCH_TIMEOUT_SECONDS = 300;

export const MatchWaitingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [doctors] = useState<ScoredDoctor[]>((location.state as { doctors?: ScoredDoctor[] })?.doctors || []);
  const [elapsed, setElapsed] = useState(0);
  const [wsStatus, setWsStatus] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const { data: matchRequest, refetch } = useQuery({
    queryKey: ['matching', 'status', id],
    queryFn: () => matchingApi.getStatus(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const handleEvent = useCallback((event: string) => (data: Record<string, unknown>) => {
    if (data.matchRequestId !== id) return;

    if (event === 'match:searching') {
      setWsStatus(`Searching among ${data.candidates} doctors...`);
    } else if (event === 'match:accepted') {
      toast.success('A doctor accepted your request!');
      void refetch();
    } else if (event === 'match:timeout') {
      toast('No doctors available right now', { icon: '⏰' });
      void refetch();
    } else if (event === 'match:cancelled') {
      toast('Match request cancelled');
      void refetch();
    }
  }, [id, refetch]);

  useEffect(() => {
    matchingSocket.connect();

    const handlers = ['match:searching', 'match:accepted', 'match:timeout', 'match:cancelled'].map(evt => {
      const handler = handleEvent(evt);
      matchingSocket.on(evt, handler);
      return { evt, handler };
    });

    return () => {
      handlers.forEach(({ evt, handler }) => matchingSocket.off(evt, handler));
      matchingSocket.disconnect();
    };
  }, [handleEvent]);

  useEffect(() => {
    if (!matchRequest) return;
    const created = new Date(matchRequest.createdAt).getTime();
    const now = Date.now();
    setElapsed(Math.floor((now - created) / 1000));

    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [matchRequest?.createdAt]);

  const handleCancel = async () => {
    if (!id) return;
    try {
      await matchingApi.cancel(id);
      queryClient.invalidateQueries({ queryKey: ['matching'] });
      navigate('/dashboard');
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const handleBrowse = async () => {
    if (!id) return;
    try {
      await matchingApi.browse(id);
      const specialty = matchRequest?.specialty;
      navigate(`/doctors${specialty ? `?specialty=${specialty}` : ''}`);
    } catch {
      toast.error('Failed to switch to browsing');
    }
  };

  if (!matchRequest) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const remaining = Math.max(0, MATCH_TIMEOUT_SECONDS - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = Math.min(100, (elapsed / MATCH_TIMEOUT_SECONDS) * 100);
  const isTerminal = ['CONSULTATION_CREATED', 'TIMEOUT', 'MANUAL_BROWSE', 'CANCELLED'].includes(matchRequest.status);

  if (matchRequest.status === 'CONSULTATION_CREATED' && matchRequest.consultationId) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Match Found!</h2>
          {matchRequest.matchedDoctor && (
            <p className="text-gray-600 mb-4">
              Dr. {matchRequest.matchedDoctor.user.firstname} {matchRequest.matchedDoctor.user.lastname} accepted your request.
            </p>
          )}
          <button
            onClick={() => navigate(`/consultation/${matchRequest.consultationId}`)}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-2"
          >
            Go to Consultation <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (matchRequest.status === 'TIMEOUT') {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <Clock className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Doctors Available Right Now</h2>
          <p className="text-gray-600 mb-6">Don't worry — you can browse and choose a doctor manually.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleBrowse}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Browse Doctors
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (matchRequest.status === 'CANCELLED') {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <XCircle className="w-14 h-14 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Match Cancelled</h2>
          <p className="text-gray-600 mb-4">This match request was cancelled.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 mt-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
          <div className="relative w-16 h-16 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full border-4 border-white/30" />
            <div
              className="absolute inset-0 rounded-full border-4 border-white transition-all duration-1000"
              style={{
                clipPath: `polygon(50% 50%, 50% 0%, ${progress > 25 ? '100% 0%' : `${50 + progress * 2}% 0%`}, ${progress > 25 ? '100%' : '100%'} ${progress > 50 ? '100%' : `${(progress - 25) * 4}%`}, ${progress > 75 ? '0%' : `${100 - (progress - 50) * 4}%`} 100%, 0% ${progress > 75 ? `${100 - (progress - 75) * 4}%` : '100%'})`,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Search className="w-7 h-7 animate-pulse" />
            </div>
          </div>
          <h2 className="text-lg font-bold">
            {matchRequest.status === 'SEARCHING' && 'Searching for a Doctor...'}
            {matchRequest.status === 'MATCHED' && 'Waiting for Doctor Response...'}
            {matchRequest.status === 'ACCEPTED' && 'Match Accepted!'}
          </h2>
          {wsStatus && <p className="text-sm text-blue-100 mt-1">{wsStatus}</p>}
        </div>

        {/* Timer */}
        {!isTerminal && (
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Time remaining</span>
              <span className="font-mono font-medium text-gray-700">{minutes}:{seconds.toString().padStart(2, '0')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${100 - progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Matched doctor info */}
        {matchRequest.status === 'MATCHED' && matchRequest.matchedDoctor && (
          <div className="px-6 py-4 border-b bg-blue-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <div className="font-medium text-sm">
                  Dr. {matchRequest.matchedDoctor.user.firstname} {matchRequest.matchedDoctor.user.lastname}
                </div>
                <div className="text-xs text-gray-500">Reviewing your request...</div>
              </div>
            </div>
          </div>
        )}

        {/* Scored doctors list */}
        {doctors.length > 0 && matchRequest.status === 'SEARCHING' && (
          <div className="px-6 py-4 border-b">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Top Candidates</div>
            <div className="space-y-2">
              {doctors.slice(0, 5).map(doc => (
                <div key={doc.doctorId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                      {doc.firstname[0]}{doc.lastname[0]}
                    </div>
                    <span className="text-gray-700">Dr. {doc.firstname} {doc.lastname}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{doc.specialty.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-medium text-blue-600">{Math.round(doc.score)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-400 mb-4">
            {matchRequest.status === 'SEARCHING'
              ? 'We\'re contacting the best-matched doctors for you.'
              : 'The doctor is reviewing your details.'}
          </p>
          {!isTerminal && (
            <button
              onClick={handleCancel}
              className="text-sm text-gray-500 hover:text-red-600 inline-flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel Search
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

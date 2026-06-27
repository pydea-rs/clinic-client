import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { matchingApi } from '../../api/matching.api';
import { matchingSocket } from '../../lib/socket/matching.socket';
import { Loader2, Search, CheckCircle, XCircle, Clock, UserCheck, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ScoredDoctor, MatchRequest } from '../../lib/types/api';
import { formatSpecialty } from '../../lib/format';

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

  useEffect(() => {
    let cancelled = false;
    matchingSocket.connect();

    const makeHandler = (event: string) => (data: Record<string, unknown>) => {
      if (cancelled || data.matchRequestId !== id) return;

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
    };

    const handlers = ['match:searching', 'match:accepted', 'match:timeout', 'match:cancelled'].map(evt => {
      const handler = makeHandler(evt);
      matchingSocket.on(evt, handler);
      return { evt, handler };
    });

    return () => {
      cancelled = true;
      handlers.forEach(({ evt, handler }) => matchingSocket.off(evt, handler));
      matchingSocket.disconnect();
    };
  }, [id, refetch]);

  useEffect(() => {
    if (!matchRequest?.createdAt) return;
    const createdMs = new Date(matchRequest.createdAt).getTime();
    if (isNaN(createdMs)) return;

    const tick = () => {
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - createdMs) / 1000)));
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

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
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
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
      <div className="max-w-lg mx-auto p-6 mt-12 animate-scale-in">
        <div className="card p-8 text-center border-emerald-200 bg-emerald-50/50">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20 animate-pop-in">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Match Found!</h2>
          {matchRequest.matchedDoctor && (
            <p className="text-gray-600 mb-5">
              Dr. {matchRequest.matchedDoctor.user.firstname} {matchRequest.matchedDoctor.user.lastname} accepted your request.
            </p>
          )}
          <button
            onClick={() => navigate(`/consultation/${matchRequest.consultationId}`)}
            className="btn-primary px-6 py-2.5 inline-flex items-center gap-2"
          >
            Go to Consultation <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (matchRequest.status === 'TIMEOUT') {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12 animate-scale-in">
        <div className="card p-8 text-center border-amber-200 bg-amber-50/50">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Doctors Available Right Now</h2>
          <p className="text-gray-600 mb-6">Don't worry — you can browse and choose a doctor manually.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleBrowse}
              className="btn-primary px-5 py-2.5 inline-flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Browse Doctors
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary px-5 py-2.5"
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
      <div className="max-w-lg mx-auto p-6 mt-12 animate-scale-in">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Match Cancelled</h2>
          <p className="text-gray-600 mb-4">This match request was cancelled.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary px-5 py-2.5"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 mt-8 animate-slide-in-up">
      <div className="card overflow-hidden shadow-soft-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-purple-500 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
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
          <h2 className="text-lg font-bold relative">
            {matchRequest.status === 'SEARCHING' && 'Searching for a Doctor...'}
            {matchRequest.status === 'MATCHED' && 'Waiting for Doctor Response...'}
            {matchRequest.status === 'ACCEPTED' && 'Match Accepted!'}
          </h2>
          {wsStatus && <p className="text-sm text-white/70 mt-1">{wsStatus}</p>}
        </div>

        {/* Timer */}
        {!isTerminal && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Time remaining</span>
              <span className="font-mono font-semibold text-gray-700">{minutes}:{seconds.toString().padStart(2, '0')}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-brand-500 to-purple-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${100 - progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Matched doctor info */}
        {matchRequest.status === 'MATCHED' && matchRequest.matchedDoctor && (
          <div className="px-6 py-4 border-b border-gray-100 bg-brand-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-100 to-brand-50 rounded-xl flex items-center justify-center ring-1 ring-brand-200/50">
                <UserCheck className="w-5 h-5 text-brand-700" />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900">
                  Dr. {matchRequest.matchedDoctor.user.firstname} {matchRequest.matchedDoctor.user.lastname}
                </div>
                <div className="text-xs text-gray-500">Reviewing your request...</div>
              </div>
            </div>
          </div>
        )}

        {/* Scored doctors list */}
        {doctors.length > 0 && matchRequest.status === 'SEARCHING' && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Candidates</div>
            <div className="space-y-2">
              {doctors.slice(0, 5).map(doc => (
                <div key={doc.doctorId} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center text-xs font-bold text-brand-600 ring-1 ring-brand-100">
                      {doc.firstname[0]}{doc.lastname[0]}
                    </div>
                    <span className="text-gray-700 font-medium">Dr. {doc.firstname} {doc.lastname}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatSpecialty(doc.specialty)}</span>
                    <span className="text-xs font-semibold text-brand-600">{Math.round(doc.score)}%</span>
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
              className="text-sm text-gray-400 hover:text-red-600 inline-flex items-center gap-1.5 transition-colors btn-press"
            >
              <X className="w-3.5 h-3.5" /> Cancel Search
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { matchingApi, patientApi } from '../../api';
import { Loader2, Search, Zap, FileText, ArrowRight, Stethoscope, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { DoctorSpecialty, TriageLevel } from '../../lib/types/api';
import { formatSpecialty } from '../../lib/format';
import { getErrorMessage } from '../../lib/api/error.utils';
import { queryClient } from '../../lib/queryClient';
import { CollapsibleSection } from '../../components/InfoDisclosure';

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/^[\s-]+/, '').trim();
}

const SPECIALTIES: DoctorSpecialty[] = [
  'GENERAL', 'CARDIOLOGY', 'DERMATOLOGY', 'ENT', 'GASTROENTEROLOGY',
  'GYNECOLOGY', 'NEUROLOGY', 'ONCOLOGY', 'ORTHOPEDICS',
  'PEDIATRICS', 'PSYCHIATRY', 'UROLOGY', 'OTHER',
];

const triageBadge = (level?: TriageLevel) => {
  const map: Record<string, { cls: string; label: string }> = {
    SELF_CARE: { cls: 'badge badge-green', label: 'Self Care' },
    SEE_DOCTOR: { cls: 'badge badge-yellow', label: 'See Doctor' },
    URGENT: { cls: 'badge badge-yellow', label: 'Urgent' },
    EMERGENCY: { cls: 'badge badge-red', label: 'Emergency' },
  };
  if (!level) return null;
  const m = map[level];
  if (!m) return null;
  return <span className={m.cls}>{m.label}</span>;
};

export const MatchRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const soapIdParam = searchParams.get('soapId');

  const [selectedSoapId, setSelectedSoapId] = useState<string>(soapIdParam || '');
  const [manualSpecialty, setManualSpecialty] = useState<DoctorSpecialty | ''>('');
  const [mode, setMode] = useState<'soap' | 'manual'>(soapIdParam ? 'soap' : 'manual');

  useEffect(() => {
    if (soapIdParam) {
      setSelectedSoapId(soapIdParam);
      setMode('soap');
    }
  }, [soapIdParam]);

  const { data: activeMatch, isLoading: checkingActive } = useQuery({
    queryKey: ['matching', 'active'],
    queryFn: matchingApi.getActive,
  });

  const { data: soapsData, isLoading: loadingSoaps } = useQuery({
    queryKey: ['patient', 'soaps', 'matching'],
    queryFn: () => patientApi.getSOAPs(1, 50),
  });

  const soaps = React.useMemo(() => soapsData?.soaps || [], [soapsData?.soaps]);

  const {
    data: fallbackSoap,
    isLoading: loadingFallbackSoap,
    isError: fallbackSoapError,
  } = useQuery({
    queryKey: ['soap', selectedSoapId],
    queryFn: () => patientApi.getSOAPDetail(selectedSoapId),
    enabled: !!selectedSoapId && !loadingSoaps && !soaps.some(s => s.id === selectedSoapId),
  });

  useEffect(() => {
    if (fallbackSoapError && selectedSoapId) {
      setSelectedSoapId('');
      toast.error('Selected SOAP note could not be found');
    }
  }, [fallbackSoapError, selectedSoapId]);

  const soapOptions = React.useMemo(() => {
    if (fallbackSoap && !soaps.some(s => s.id === fallbackSoap.id)) {
      return [fallbackSoap, ...soaps];
    }
    return soaps;
  }, [fallbackSoap, soaps]);

  const createMutation = useMutation({
    mutationFn: matchingApi.createRequest,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['matching', 'active'] });
      navigate(`/matching/${data.matchRequest.id}/waiting`, { state: { doctors: data.doctors } });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to create match request'));
    },
  });

  if (checkingActive) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (activeMatch && !['TIMEOUT', 'MANUAL_BROWSE', 'CONSULTATION_CREATED', 'CANCELLED'].includes(activeMatch.status)) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="card border-brand-200 bg-brand-50 p-6 text-center">
          <Search className="w-10 h-10 text-brand-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">Active Match In Progress</h2>
          <p className="text-gray-600 text-sm mb-4">You already have a match request being processed.</p>
          <button
            onClick={() => navigate(`/matching/${activeMatch.id}/waiting`)}
            className="btn-primary px-4 py-2 inline-flex items-center gap-2"
          >
            Go to Waiting Room <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const selectedSoap = soaps.find(s => s.id === selectedSoapId) ?? fallbackSoap;

  const handleSubmit = () => {
    if (mode === 'soap' && selectedSoapId) {
      createMutation.mutate({ soapId: selectedSoapId });
    } else if (mode === 'manual' && manualSpecialty) {
      createMutation.mutate({ specialty: manualSpecialty });
    } else {
      toast.error(mode === 'soap' ? 'Please select a SOAP note' : 'Please select a specialty');
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-6 animate-fade-in">
      <div className="mb-6 animate-slide-in-up">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-purple-500 rounded-xl flex items-center justify-center shadow-soft mb-4"><Stethoscope className="w-5 h-5 text-white" /></div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Find a Doctor</h1>
        <p className="text-gray-600 dark:text-slate-400">We'll match you with the best available doctor based on your needs.</p>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-medium text-gray-500 dark:text-slate-400">
          <span className="badge badge-brand">1. Describe Needs</span>
          <span>→</span>
          <span className="badge badge-gray">2. Contacting Top Matches</span>
          <span>→</span>
          <span className="badge badge-gray">3. Consultation Ready</span>
        </div>
      </div>

      <CollapsibleSection
        title="How auto-matching works"
        subtitle="Queue priority, 45-second doctor window, and manual browse option"
        icon={<Clock className="w-4 h-4" />}
        className="mb-6 animate-slide-in-up"
      >
        <ul className="space-y-1.5 list-disc list-inside">
          <li>We rank verified doctors by specialty fit, urgency, live online status, and patient rating.</li>
          <li>Each candidate gets <strong>45 seconds</strong> to accept before the offer automatically cascades to the next match (5-minute total window).</li>
          <li>You can cancel the search or browse all doctors manually at any moment.</li>
        </ul>
      </CollapsibleSection>

      {/* Mode selector */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setMode('soap')}
          className={`flex-1 p-4 rounded-2xl border-2 transition-all duration-200 ease-spring hover:-translate-y-0.5 text-left ${
            mode === 'soap'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 shadow-soft'
              : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm'
          }`}
        >
          <FileText className={`w-5 h-5 mb-2 ${mode === 'soap' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-slate-500'}`} />
          <div className="font-medium text-sm text-gray-900 dark:text-white">From AI Consultation</div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Use your SOAP note to auto-detect specialty</div>
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 p-4 rounded-2xl border-2 transition-all duration-200 ease-spring hover:-translate-y-0.5 text-left ${
            mode === 'manual'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 shadow-soft'
              : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm'
          }`}
        >
          <Search className={`w-5 h-5 mb-2 ${mode === 'manual' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-slate-500'}`} />
          <div className="font-medium text-sm text-gray-900 dark:text-white">Choose Specialty</div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Manually select the type of doctor you need</div>
        </button>
      </div>

      {/* SOAP selection */}
      {mode === 'soap' && (
        <div className="mb-6 animate-fade-in">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Select a SOAP Note</label>
          {loadingSoaps || loadingFallbackSoap ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : soapOptions.length === 0 ? (
            <div className="card bg-gray-50/80 dark:bg-slate-800/60 p-4 text-center">
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-2">No SOAP notes found. Start an AI conversation first.</p>
              <button onClick={() => navigate('/ai/new')} className="text-brand-600 dark:text-brand-400 hover:text-brand-700 text-sm font-medium">
                Start AI Chat
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {soapOptions.map(soap => (
                <button
                  key={soap.id}
                  onClick={() => setSelectedSoapId(soap.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                    selectedSoapId === soap.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 shadow-soft'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {soap.assessment ? stripMarkdown(soap.assessment).substring(0, 80) + (stripMarkdown(soap.assessment).length > 80 ? '...' : '') : 'SOAP Note'}
                    </div>
                    <div className="flex items-center gap-2">
                      {triageBadge(soap.triageLevel)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {soap.suggestedSpecialty && (
                      <span className="text-xs text-brand-600 dark:text-brand-400">{formatSpecialty(soap.suggestedSpecialty)}</span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-slate-500">{new Date(soap.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedSoap && (
            <div className="mt-3 bg-gray-50/80 dark:bg-slate-800/70 rounded-xl p-3 text-sm">
              <div className="font-medium text-gray-700 dark:text-slate-300 mb-1">Auto-detected:</div>
              <div className="flex items-center gap-3">
                {selectedSoap.suggestedSpecialty && (
                  <span className="text-brand-600 dark:text-brand-400">Specialty: {formatSpecialty(selectedSoap.suggestedSpecialty)}</span>
                )}
                {triageBadge(selectedSoap.triageLevel)}
                {!selectedSoap.suggestedSpecialty && (
                  <span className="text-gray-500 dark:text-slate-400">Best available doctor (any specialty)</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual specialty selection */}
      {mode === 'manual' && (
        <div className="mb-6 animate-fade-in">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Select Specialty</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPECIALTIES.map(spec => (
              <button
                key={spec}
                onClick={() => setManualSpecialty(spec)}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm transition-all duration-200 btn-press ${
                  manualSpecialty === spec
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 shadow-sm font-medium'
                    : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                {formatSpecialty(spec)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={createMutation.isPending || (mode === 'soap' && !selectedSoapId) || (mode === 'manual' && !manualSpecialty)}
        className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {createMutation.isPending ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Finding doctors...</>
        ) : (
          <><Zap className="w-5 h-5" /> Find Best Match</>
        )}
      </button>
    </div>
  );
};

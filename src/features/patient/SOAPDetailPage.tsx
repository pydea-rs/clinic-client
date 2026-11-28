import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { patientApi } from '../../api';
import { Loader2, FileText, Calendar, Tag, AlertTriangle, Zap, ShieldAlert } from 'lucide-react';
import { formatSpecialty, formatTriageLevel } from '../../lib/format';
import { getMessageDirection } from '../../lib/text-direction';
import { useAuthStore } from '../../lib/stores/auth.store';
import { CollapsibleSection, InfoTip } from '../../components/InfoDisclosure';

const TRIAGE_GUIDANCE: Record<string, string> = {
  SELF_CARE: 'Symptoms appear mild. Monitor at home, rest, and reach out to a clinician if anything worsens.',
  SEE_DOCTOR: 'Recommended to schedule a regular consultation with a clinician for further evaluation.',
  URGENT: 'Prompt medical review is recommended soon. Use auto-match or visit urgent care if symptoms intensify.',
  EMERGENCY: 'Seek immediate in-person emergency medical attention or call local emergency services.',
};

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 last:mb-0 ms-4 space-y-0.5 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 last:mb-0 ms-4 space-y-0.5 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
};

export const SOAPDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const { data: soap, isLoading, error } = useQuery({
    queryKey: ['soap', id],
    queryFn: () => {
      if (!id) {
        throw new Error('SOAP ID is required');
      }
      return patientApi.getSOAPDetail(id);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !soap) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">SOAP Note Not Found</h2>
          <p className="text-gray-600 dark:text-slate-400">The SOAP note you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-purple-500 text-white rounded-2xl shadow-soft-xl p-8 mb-8 animate-slide-in-up">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-8 h-8 drop-shadow-md" />
              <h1 className="text-3xl font-bold">SOAP Note</h1>
            </div>
            <p className="text-white/80">
              <Calendar className="w-4 h-4 inline mr-2" />
              {formatDate(soap.createdAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {soap.suggestedSpecialty && (
              <div className="text-right">
                <p className="text-white/70 text-sm mb-1">Specialty</p>
                <p className="text-xl font-semibold">{formatSpecialty(soap.suggestedSpecialty)}</p>
              </div>
            )}
            {user?.role === 'PATIENT' && (
              <Link
                to={`/matching/request?soapId=${soap.id}`}
                className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm px-4 py-2 rounded-xl shadow-sm transition-colors"
              >
                <Zap className="w-4 h-4" />
                Find a Doctor
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Overall Container with glow */}
      <div className="card-glow rounded-2xl p-1">
        <div className="bg-white dark:bg-slate-900 rounded-2xl">
          {/* SOAP Sections */}
          <div className="space-y-6 p-6">
            {/* Subjective */}
            <div className="card p-6 border-l-4 border-blue-400 animate-slide-in-up" style={{ animationDelay: '80ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Subjective</h2>
                <InfoTip label="What Subjective means" align="left">
                  Symptoms, timeline, pain details, and medical context described in the patient's own words.
                </InfoTip>
              </div>
              <div
                dir={soap.subjective ? getMessageDirection(soap.subjective) : 'ltr'}
                className="text-gray-700 dark:text-slate-300 leading-relaxed prose prose-sm max-w-none text-start"
              >
                {soap.subjective ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{soap.subjective}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 dark:text-slate-500 italic">No data available</p>
                )}
              </div>
            </div>

            {/* Objective */}
            <div className="card p-6 border-l-4 border-emerald-400 animate-slide-in-up" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-emerald-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Objective</h2>
                <InfoTip label="What Objective means" align="left">
                  Measurable signs, reported vitals, medications, or prior test details mentioned during intake.
                </InfoTip>
              </div>
              <div
                dir={soap.objective ? getMessageDirection(soap.objective) : 'ltr'}
                className="text-gray-700 dark:text-slate-300 leading-relaxed prose prose-sm max-w-none text-start"
              >
                {soap.objective ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{soap.objective}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 dark:text-slate-500 italic">No data available</p>
                )}
              </div>
            </div>

            {/* Assessment */}
            <div className="card p-6 border-l-4 border-amber-400 animate-slide-in-up" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assessment</h2>
                <InfoTip label="What Assessment means" align="left">
                  Preliminary AI synthesis of possible causes for clinician review — not a confirmed medical diagnosis.
                </InfoTip>
              </div>
              <div
                dir={soap.assessment ? getMessageDirection(soap.assessment) : 'ltr'}
                className="text-gray-700 dark:text-slate-300 leading-relaxed prose prose-sm max-w-none text-start"
              >
                {soap.assessment ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{soap.assessment}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 dark:text-slate-500 italic">No data available</p>
                )}
              </div>
            </div>

            {/* Plan */}
            <div className="card p-6 border-l-4 border-purple-400 animate-slide-in-up" style={{ animationDelay: '320ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-purple-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plan</h2>
                <InfoTip label="What Plan means" align="left">
                  Suggested follow-up steps, specialist type, or questions for your doctor visit.
                </InfoTip>
              </div>
              <div
                dir={soap.plan ? getMessageDirection(soap.plan) : 'ltr'}
                className="text-gray-700 dark:text-slate-300 leading-relaxed prose prose-sm max-w-none text-start"
              >
                {soap.plan ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{soap.plan}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 dark:text-slate-500 italic">No data available</p>
                )}
              </div>
            </div>

            {/* Triage */}
            {soap.triageLevel && (
              <div className="card p-6 border-l-4 border-red-500 animate-slide-in-up" style={{ animationDelay: '400ms' }}>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Triage</h2>
                  <span className="badge badge-red text-base font-semibold px-4 py-1.5">{formatTriageLevel(soap.triageLevel)}</span>
                </div>
                {TRIAGE_GUIDANCE[soap.triageLevel] && (
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed mt-2">
                    {TRIAGE_GUIDANCE[soap.triageLevel]}
                  </p>
                )}
              </div>
            )}

            {/* Collapsible Raw Note (collapsed by default to keep layout clean) */}
            {soap.rawNote && (
              <CollapsibleSection
                title="Raw Clinical Transcript / Note"
                subtitle="Expand to inspect the unformatted AI summary text"
                icon={<FileText className="w-4 h-4" />}
              >
                <pre
                  dir={getMessageDirection(soap.rawNote)}
                  className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 overflow-x-auto bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 whitespace-pre-wrap text-start mt-2"
                >
                  {soap.rawNote}
                </pre>
              </CollapsibleSection>
            )}

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>AI SOAP notes are preliminary structured summaries prepared to save time with a licensed physician — they do not replace professional diagnosis.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-8 card bg-gray-50/50 dark:bg-slate-800/40 p-6 text-sm text-gray-600 dark:text-slate-400 animate-fade-in space-y-1" style={{ animationDelay: '500ms' }}>
        <p>
          <span className="font-medium text-gray-800 dark:text-slate-200">Conversation ID:</span> {soap.conversationId}
        </p>
        <p>
          <span className="font-medium text-gray-800 dark:text-slate-200">Last Updated:</span> {formatDate(soap.updatedAt)}
        </p>
      </div>
    </div>
  );
};

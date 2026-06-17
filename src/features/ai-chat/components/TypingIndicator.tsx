import React, { useState, useEffect, useRef } from 'react';
import { Bot, Brain, Search, Stethoscope, Sparkles, Activity } from 'lucide-react';

const THINKING_PHASES = [
  { text: 'Thinking', icon: Brain, color: 'text-purple-500' },
  { text: 'Analyzing symptoms', icon: Search, color: 'text-blue-500' },
  { text: 'Reviewing medical context', icon: Stethoscope, color: 'text-teal-500' },
  { text: 'Processing', icon: Activity, color: 'text-indigo-500' },
  { text: 'Preparing response', icon: Sparkles, color: 'text-amber-500' },
];

const PHASE_INTERVAL_MIN = 2400;
const PHASE_INTERVAL_MAX = 4000;

export const TypingIndicator: React.FC = () => {
  const [phaseIndex, setPhaseIndex] = useState(() => Math.floor(Math.random() * THINKING_PHASES.length));
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const scheduleNext = () => {
      const delay = PHASE_INTERVAL_MIN + Math.floor(Math.random() * (PHASE_INTERVAL_MAX - PHASE_INTERVAL_MIN));
      timerRef.current = setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          setPhaseIndex((prev) => {
            let next = Math.floor(Math.random() * THINKING_PHASES.length);
            while (next === prev && THINKING_PHASES.length > 1) {
              next = Math.floor(Math.random() * THINKING_PHASES.length);
            }
            return next;
          });
          setIsFading(false);
          scheduleNext();
        }, 300);
      }, delay);
    };

    scheduleNext();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const phase = THINKING_PHASES[phaseIndex];
  const PhaseIcon = phase.icon;

  return (
    <div className="flex justify-start mb-5 animate-msg-in">
      <div className="flex items-end gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mb-5 shadow-sm">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <div className="bg-white border border-gray-200/80 px-5 py-3.5 rounded-2xl rounded-bl-sm shadow-sm">
            <div
              className={`flex items-center gap-2.5 transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}
            >
              <div className="relative w-4 h-4 flex-shrink-0">
                <PhaseIcon className={`w-4 h-4 ${phase.color} animate-thinking-icon`} />
              </div>
              <span className="text-sm text-gray-500 font-medium">{phase.text}</span>
              <span className="flex items-center gap-0.5 ml-0.5">
                <span className="w-1 h-1 bg-gray-400 rounded-full typing-dot" />
                <span className="w-1 h-1 bg-gray-400 rounded-full typing-dot" />
                <span className="w-1 h-1 bg-gray-400 rounded-full typing-dot" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

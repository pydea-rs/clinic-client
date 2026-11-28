import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, HelpCircle, Info } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  className = '',
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div
      className={`rounded-xl border border-gray-200/80 dark:border-slate-700/70 bg-gray-50/70 dark:bg-slate-800/50 transition-colors duration-200 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left rounded-xl hover:bg-gray-100/60 dark:hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-brand-600 dark:text-brand-400 flex-shrink-0">
            {icon ?? <Info className="w-4 h-4" />}
          </span>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-slate-100 block truncate">
              {title}
            </span>
            {subtitle && (
              <span className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 dark:text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-brand-600 dark:text-brand-400' : ''
          }`}
        />
      </button>
      <div
        id={contentId}
        className={`accordion-grid ${open ? 'accordion-open' : ''}`}
      >
        <div className="accordion-inner">
          <div className="px-4 pb-3.5 pt-1 text-xs sm:text-sm text-gray-600 dark:text-slate-300 border-t border-gray-200/60 dark:border-slate-700/60">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface InfoTipProps {
  label: string;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export const InfoTip: React.FC<InfoTipProps> = ({
  label,
  children,
  align = 'right',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={label}
        aria-expanded={open}
        aria-controls={popoverId}
        className="w-5 h-5 rounded-full inline-flex items-center justify-center text-gray-400 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={label}
          className={`absolute top-full mt-2 w-64 sm:w-72 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-soft-lg text-xs text-gray-600 dark:text-slate-300 leading-relaxed z-40 animate-scale-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { useThemeStore, ThemeMode, AccentColor } from '../lib/stores/theme.store';
import { Sun, Moon, Monitor, X, Palette, Check } from 'lucide-react';

const modes: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const accents: { value: AccentColor; label: string; swatch: string }[] = [
  { value: 'indigo', label: 'Indigo', swatch: '#6366f1' },
  { value: 'blue', label: 'Blue', swatch: '#3b82f6' },
  { value: 'violet', label: 'Violet', swatch: '#8b5cf6' },
  { value: 'rose', label: 'Rose', swatch: '#f43f5e' },
  { value: 'emerald', label: 'Emerald', swatch: '#10b981' },
  { value: 'amber', label: 'Amber', swatch: '#f59e0b' },
];

interface ThemeCustomizerProps {
  open: boolean;
  onClose: () => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ open, onClose }) => {
  const { mode, accent, setMode, setAccent } = useThemeStore();

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 z-50 shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center">
              <Palette className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Customize</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-8 overflow-y-auto flex-1">
          {/* Theme Mode */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">
              Theme Mode
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {modes.map((m) => {
                const active = mode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      active
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                        : 'border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <m.icon
                      className={`w-5 h-5 ${
                        active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-slate-500'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        active
                          ? 'text-brand-700 dark:text-brand-300'
                          : 'text-gray-500 dark:text-slate-400'
                      }`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">
              Accent Color
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {accents.map((a) => {
                const active = accent === a.value;
                return (
                  <button
                    key={a.value}
                    onClick={() => setAccent(a.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                      active
                        ? 'border-gray-300 dark:border-slate-500 bg-gray-50 dark:bg-slate-800'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="relative">
                      <div
                        className="w-8 h-8 rounded-full shadow-sm transition-transform duration-200"
                        style={{
                          backgroundColor: a.swatch,
                          transform: active ? 'scale(1.1)' : 'scale(1)',
                        }}
                      />
                      {active && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">
              Preview
            </h3>
            <div className="space-y-3">
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shadow-sm">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Sample Card
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      This is how cards will look
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary px-4 py-2 text-sm flex-1">Primary</button>
                <button className="btn-secondary px-4 py-2 text-sm flex-1">Secondary</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-brand">Brand</span>
                <span className="badge badge-blue">Info</span>
                <span className="badge badge-green">Success</span>
                <span className="badge badge-red">Alert</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

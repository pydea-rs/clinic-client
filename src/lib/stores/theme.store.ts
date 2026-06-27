import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'indigo' | 'blue' | 'violet' | 'rose' | 'emerald' | 'amber';

interface ThemeState {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
}

function applyThemeToDOM(mode: ThemeMode, accent: AccentColor) {
  const root = document.documentElement;
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-accent', accent);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      accent: 'indigo',
      setMode: (mode) => {
        set({ mode });
        applyThemeToDOM(mode, get().accent);
      },
      setAccent: (accent) => {
        set({ accent });
        applyThemeToDOM(get().mode, accent);
      },
    }),
    { name: 'ai-clinic-theme' },
  ),
);

export function initializeTheme() {
  const { mode, accent } = useThemeStore.getState();
  applyThemeToDOM(mode, accent);

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const s = useThemeStore.getState();
      if (s.mode === 'system') applyThemeToDOM('system', s.accent);
    });
}

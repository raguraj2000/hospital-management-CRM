import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** auto = follows the computer's own light / dark setting (the default). light / dark = the user's own choice, kept. */
export type Theme = 'light' | 'dark' | 'auto';

const system = () => window.matchMedia('(prefers-color-scheme: dark)');

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useTheme = create<ThemeState>()(
  persist((set) => ({ theme: 'auto', setTheme: (theme) => set({ theme }) }), {
    name: 'theme',
    version: 1,
    // The third choice has been "system" and then "auto" by the clock; "auto" now follows the computer's setting again.
    migrate: (saved) => {
      const old = (saved as { theme?: string } | null)?.theme;
      return { theme: old === 'light' || old === 'dark' ? old : 'auto' } as ThemeState;
    },
  }),
);

/** What the choice means right now. */
export const isDark = (theme: Theme) => theme === 'dark' || (theme === 'auto' && system().matches);

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', isDark(theme));
}

/** Call once at startup: applies the saved theme, and on "auto" switches by itself when the computer's setting changes. */
export function initTheme() {
  apply(useTheme.getState().theme);
  useTheme.subscribe((s) => apply(s.theme));
  system().addEventListener('change', () => apply(useTheme.getState().theme));
}

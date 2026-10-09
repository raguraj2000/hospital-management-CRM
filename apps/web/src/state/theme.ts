import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** auto = light during the day, dark from evening to morning (the default). light / dark = the user's own choice, kept. */
export type Theme = 'light' | 'dark' | 'auto';

const DAY_STARTS_AT = 6; // 6 am
const NIGHT_STARTS_AT = 18; // 6 pm
const isNight = (now = new Date()) => now.getHours() >= NIGHT_STARTS_AT || now.getHours() < DAY_STARTS_AT;

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useTheme = create<ThemeState>()(
  persist((set) => ({ theme: 'auto', setTheme: (theme) => set({ theme }) }), {
    name: 'theme',
    version: 1,
    // Before version 1 the third choice was "system" (follow Windows); it is now "auto" (follow the clock).
    migrate: (saved) => {
      const old = (saved as { theme?: string } | null)?.theme;
      return { theme: old === 'light' || old === 'dark' ? old : 'auto' } as ThemeState;
    },
  }),
);

/** What the choice means right now. */
export const isDark = (theme: Theme) => theme === 'dark' || (theme === 'auto' && isNight());

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', isDark(theme));
}

/** Call once at startup: applies the saved theme, and on "auto" switches by itself at 6 am and 6 pm while the app is open. */
export function initTheme() {
  apply(useTheme.getState().theme);
  useTheme.subscribe((s) => apply(s.theme));
  window.setInterval(() => apply(useTheme.getState().theme), 60_000);
}

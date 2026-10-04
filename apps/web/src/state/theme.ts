import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

export const useTheme = create<{ theme: Theme; setTheme: (t: Theme) => void }>()(
  persist((set) => ({ theme: 'light', setTheme: (theme) => set({ theme }) }), { name: 'theme' }),
);

const media = window.matchMedia('(prefers-color-scheme: dark)');

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
}

/** Call once at startup: applies the saved theme and follows the OS when set to "system". */
export function initTheme() {
  apply(useTheme.getState().theme);
  useTheme.subscribe((s) => apply(s.theme));
  media.addEventListener('change', () => apply(useTheme.getState().theme));
}

import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'auto';

const KEY = 'clinic.themePreference';
const NIGHT_START_HOUR = 18; // 6pm
const NIGHT_END_HOUR = 6; // 6am

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'auto';
}

export function setThemePreference(pref: ThemePreference): void {
  localStorage.setItem(KEY, pref);
  applyTheme();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const CHANGE_EVENT = 'clinic-theme-change';

/** Current preference, kept in sync across every switch on screen (top bar + Preferences). */
export function useThemePreference(): [ThemePreference, (pref: ThemePreference) => void] {
  const [pref, setPref] = useState<ThemePreference>(getThemePreference());
  useEffect(() => {
    const sync = () => setPref(getThemePreference());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);
  return [pref, setThemePreference];
}

function isNightHours(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

export function effectiveTheme(): 'light' | 'dark' {
  const pref = getThemePreference();
  if (pref === 'auto') return isNightHours() ? 'dark' : 'light';
  return pref;
}

export function applyTheme(): void {
  document.documentElement.setAttribute('data-theme', effectiveTheme());
}

/** Re-checks every minute so Automatic crosses the 6pm/6am boundary while the app stays open. */
export function startThemeAutoUpdate(): () => void {
  applyTheme();
  const interval = setInterval(applyTheme, 60_000);
  return () => clearInterval(interval);
}

import { getLocales } from 'expo-localization';
import { useEffect } from 'react';

import { useGame } from '../game/state';
import { resolveLanguage, setLanguage, type Lang } from './index';

function deviceLanguage(): string | null {
  try {
    return getLocales()[0]?.languageCode ?? null;
  } catch {
    return null;
  }
}

/**
 * Ayardaki dili (ya da cihaz dilini) uygular ve etkin dili döner. Dönen değer arayüzün `key`'i
 * olarak kullanılır: dil değişince metinler yeniden çizilir.
 */
export function useLanguage(): Lang {
  const setting = useGame((s) => s.settings.language);
  const lang = resolveLanguage(setting, deviceLanguage());
  setLanguage(lang);
  useEffect(() => {
    setLanguage(lang);
  }, [lang]);
  return lang;
}

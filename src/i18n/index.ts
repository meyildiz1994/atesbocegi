import en from './en.json';
import tr from './tr.json';

export type Lang = 'en' | 'tr';
export type I18nKey = keyof typeof en;

const dicts: Record<Lang, Record<string, string>> = { en, tr };

let current: Lang = 'en';

/** Ayardaki seçim ('system' ise cihaz dili; Türkçe dışındaki her dil İngilizce). */
export function resolveLanguage(setting: Lang | 'system', deviceLanguageCode: string | null | undefined): Lang {
  if (setting !== 'system') return setting;
  return deviceLanguageCode?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export function setLanguage(lang: Lang): void {
  current = lang;
}

export function getLanguage(): Lang {
  return current;
}

export function t(key: I18nKey, vars?: Record<string, string | number>): string {
  const raw = dicts[current][key] ?? en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ''));
}

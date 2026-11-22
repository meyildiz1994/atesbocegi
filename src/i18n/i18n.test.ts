import en from './en.json';
import tr from './tr.json';
import { resolveLanguage, setLanguage, t } from './index';

it('EN ve TR aynı anahtarlara sahip', () => {
  expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
});

it('değişken yerleştirir ve dil değiştirir', () => {
  setLanguage('en');
  expect(t('hud.perJar', { count: 3, capacity: 10 })).toBe('3/10');
  setLanguage('tr');
  expect(t('zone.1')).toBe('Karanlık Koru');
  setLanguage('en');
});

it('cihaz dili: Türkçe ise tr, diğerleri en; ayar seçimi önceliklidir', () => {
  expect(resolveLanguage('system', 'tr')).toBe('tr');
  expect(resolveLanguage('system', 'TR')).toBe('tr');
  expect(resolveLanguage('system', 'de')).toBe('en');
  expect(resolveLanguage('system', null)).toBe('en');
  expect(resolveLanguage('en', 'tr')).toBe('en');
  expect(resolveLanguage('tr', 'en')).toBe('tr');
});

it('çevirilerde boş metin yok ve değişkenler iki dilde aynı', () => {
  const vars = (v: string) => (v.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');
  for (const k of Object.keys(en) as (keyof typeof en)[]) {
    expect(en[k].length).toBeGreaterThan(0);
    expect((tr as Record<string, string>)[k]!.length).toBeGreaterThan(0);
    expect(vars((tr as Record<string, string>)[k]!)).toBe(vars(en[k]));
  }
});

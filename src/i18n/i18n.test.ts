import en from './en.json';
import tr from './tr.json';
import { setLanguage, t } from './index';

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

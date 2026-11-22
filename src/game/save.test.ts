import { SAVE } from '../config/balance';
import { deserialize, migrate, newSave, serialize } from './save';

const now = 1_700_000_000_000;

it('gidiş-dönüş', () => {
  const s = newSave(now);
  s.light = 5;
  expect(deserialize(serialize(s), now)).toEqual(s);
});

it('sürümsüz kayıt migrasyonla güncel sürüme çıkar', () => {
  expect(migrate({ light: 3 }).saveVersion).toBe(SAVE.version);
  expect(deserialize(JSON.stringify({ light: 3 }), now)!.light).toBe(3);
});

it('bozuk veri güvenli varsayılana döner', () => {
  expect(deserialize('{bozuk', now)).toBeNull();
  expect(deserialize(undefined, now)).toBeNull();
  const d = deserialize(JSON.stringify({ light: -5, levels: { ring: 'x' }, zoneIndex: 99 }), now)!;
  expect(d.light).toBe(0);
  expect(d.levels.ring).toBe(0);
  expect(d.zoneIndex).toBe(4);
});

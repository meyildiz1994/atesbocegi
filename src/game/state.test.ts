import { PRESTIGE, ZONES } from '../config/balance';
import { readSave, writeSave, memoryStore } from './save';
import { initialGameState, lightPerSecond, selectBrightness, statsOf, useGame } from './state';

const T0 = 1_700_000_000_000;
const g = () => useGame.getState();

beforeEach(() => useGame.setState(initialGameState(T0)));

it('kavanoz boşaltma Işık ekler ve bölge ışığını artırır', () => {
  expect(g().emptyJar(10, T0)).toBe(10);
  expect(g().light).toBe(10);
  expect(g().runLight).toBe(10);
  expect(g().zoneLight[0]).toBe(10);
  expect(selectBrightness(g())).toBeGreaterThan(0);
  expect(lightPerSecond(g(), T0)).toBe(1);
});

it('yükseltme alınır, Işık düşer; parası yetmezse alınmaz', () => {
  expect(g().buyUpgrade('ring')).toBe(false);
  useGame.setState({ light: 100 });
  expect(g().buyUpgrade('ring')).toBe(true);
  expect(g().levels.ring).toBe(1);
  expect(g().light).toBe(90);
});

it('×10 ve Maks', () => {
  useGame.setState({ light: 1e6, buyMode: 10 });
  g().buyUpgrade('ring');
  expect(g().levels.ring).toBe(10);
  g().setBuyMode('max');
  g().buyUpgrade('jar');
  expect(g().levels.jar).toBeGreaterThan(10);
});

it('tüm yükseltmeler alınabiliyor', () => {
  useGame.setState({ light: 1e15 });
  for (const id of ['ring', 'jar', 'bright', 'crowd', 'spirit', 'autoEmpty', 'magnet'] as const) {
    expect(g().buyUpgrade(id)).toBe(true);
    expect(g().levels[id]).toBe(1);
  }
});

it('bölge açılmadan geçilemez', () => {
  g().setZone(1);
  expect(g().zoneIndex).toBe(0);
  useGame.setState({ runLight: ZONES[1].unlockAt });
  g().setZone(1);
  expect(g().zoneIndex).toBe(1);
  expect(statsOf(g()).valuePerFirefly).toBe(ZONES[1].multiplier);
});

it('Şafak: sıfırlar, Yıldız Tozu verir, keepAuto korur', () => {
  useGame.setState({
    runLight: 4 * PRESTIGE.unlockAt,
    light: 123,
    levels: { ...g().levels, ring: 5, autoEmpty: 1 },
    skills: { ...g().skills, keepAuto: true },
  });
  expect(g().prestige()).toBe(2);
  expect(g().light).toBe(0);
  expect(g().levels.ring).toBe(0);
  expect(g().levels.autoEmpty).toBe(1);
  expect(g().stardust).toBe(2);
  expect(g().prestigeCount).toBe(1);
  expect(statsOf(g()).globalMultiplier).toBeCloseTo(1.2);
});

it('Şafak eşiğin altında olmaz', () => {
  useGame.setState({ runLight: PRESTIGE.unlockAt - 1 });
  expect(g().prestige()).toBe(0);
});

it('yetenek alınır', () => {
  useGame.setState({ stardust: 3 });
  expect(g().buySkill('deepJar')).toBe(false);
  expect(g().buySkill('dawnRing')).toBe(true);
  expect(g().buySkill('deepJar')).toBe(true);
  expect(g().stardust).toBe(0);
});

it('offline kazanç: ruhlarla birikir, alınır', () => {
  useGame.setState({ levels: { ...g().levels, spirit: 2 }, lastSeen: T0 });
  const r = g().computeOffline(T0 + 3600_000);
  expect(r).not.toBeNull();
  expect(r!.seconds).toBe(3600);
  const gain = g().claimOffline(2);
  expect(gain).toBeCloseTo(r!.gain * 2);
  expect(g().offlineReport).toBeNull();
});

it('offline: 2 saat üst sınırı ve saat geri alınması', () => {
  useGame.setState({ levels: { ...g().levels, spirit: 1 }, lastSeen: T0 });
  expect(g().computeOffline(T0 + 10 * 3600_000)!.seconds).toBe(7200);
  useGame.setState({ lastSeen: T0 });
  expect(g().computeOffline(T0 - 3600_000)).toBeNull();
});

it('kaydet / yükle aynı durumu verir', () => {
  useGame.setState({ light: 42, levels: { ...g().levels, jar: 3 }, stardust: 2 });
  const store = memoryStore();
  writeSave(store, g().snapshot(T0));
  useGame.setState(initialGameState(T0));
  g().hydrate(readSave(store, T0)!);
  expect(g().light).toBe(42);
  expect(g().levels.jar).toBe(3);
  expect(g().stardust).toBe(2);
});

it('ilerlemeyi sıfırlama ayarları korur', () => {
  useGame.setState({ light: 99, settings: { ...g().settings, haptics: false } });
  g().resetProgress(T0);
  expect(g().light).toBe(0);
  expect(g().settings.haptics).toBe(false);
});

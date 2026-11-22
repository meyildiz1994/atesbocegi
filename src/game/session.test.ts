import { SAVE } from '../config/balance';
import { memoryStore, newSave, readSave, serialize } from './save';
import { bootFrom, resetIn, saveTo } from './session';
import { initialGameState, useGame } from './state';

const T0 = 1_700_000_000_000;
const g = () => useGame.getState();
const HOUR = 3600_000;

beforeEach(() => useGame.setState(initialGameState(T0)));

it('kapatıp açınca ilerleme geri gelir ve offline kazanç bir kez hesaplanır', () => {
  const store = memoryStore();
  bootFrom(store, T0); // yeni oyuncu
  useGame.setState({ light: 1234, levels: { ...g().levels, spirit: 2, jar: 4 }, stardust: 3, tutorialStep: 5 });
  saveTo(store, T0 + 1000);

  // Uygulama kapandı: bellekteki durum gitti.
  useGame.setState(initialGameState(T0));

  const report = bootFrom(store, T0 + 1000 + HOUR);
  expect(g().light).toBe(1234);
  expect(g().levels.spirit).toBe(2);
  expect(g().levels.jar).toBe(4);
  expect(g().stardust).toBe(3);
  expect(g().tutorialStep).toBe(5);
  expect(report).not.toBeNull();
  expect(report!.seconds).toBe(3600);
  const gain = g().claimOffline();
  expect(g().light).toBeCloseTo(1234 + gain);

  // Hemen tekrar açılırsa aynı yokluk ikinci kez sayılmaz.
  saveTo(store, T0 + 1000 + HOUR);
  useGame.setState(initialGameState(T0));
  expect(bootFrom(store, T0 + 1000 + HOUR + 5000)).toBeNull();
});

it('panel açıkken uygulama kapanırsa alınmamış offline kazanç kaybolmaz', () => {
  const store = memoryStore();
  useGame.setState({ levels: { ...g().levels, spirit: 1 }, lastSeen: T0 });
  saveTo(store, T0);
  useGame.setState(initialGameState(T0));
  const first = bootFrom(store, T0 + HOUR)!;
  // Panel açıkken uygulama kapandı, 60 sn sonra yeniden açıldı.
  useGame.setState(initialGameState(T0));
  bootFrom(store, T0 + HOUR + 60_000);
  expect(first.gain).toBeGreaterThan(0);
  // Önceki rapor korunur, yeni 60 sn üstüne eklenir.
  expect(g().offlineReport!.seconds).toBe(3660);
  expect(g().offlineReport!.gain).toBeGreaterThan(first.gain);
});

it('saat ileri alınırsa üst sınır, geri alınırsa 0', () => {
  const store = memoryStore();
  useGame.setState({ levels: { ...g().levels, spirit: 1 } });
  saveTo(store, T0);
  useGame.setState(initialGameState(T0));
  expect(bootFrom(store, T0 + 1000 * HOUR)!.seconds).toBe(7200);

  saveTo(store, T0);
  useGame.setState(initialGameState(T0));
  expect(bootFrom(store, T0 - 5 * HOUR)).toBeNull();
  expect(g().levels.spirit).toBe(1);
});

it('ana kayıt bozulursa yedekten yüklenir', () => {
  const store = memoryStore();
  useGame.setState({ light: 10 });
  saveTo(store, T0);
  useGame.setState({ light: 20 });
  saveTo(store, T0 + 10_000);
  store.set(SAVE.key, '{bozuk');
  expect(readSave(store, T0)!.light).toBe(10);
});

it('eski sürüm kayıt açılışta yüklenir', () => {
  const store = memoryStore();
  const old = { ...newSave(T0), light: 77 } as Record<string, unknown>;
  delete old.saveVersion;
  store.set(SAVE.key, serialize(old as never));
  bootFrom(store, T0 + 1000);
  expect(g().light).toBe(77);
  expect(g().saveVersion).toBe(SAVE.version);
});

it('sıfırlama kaydı ve yedeği siler, ayarları korur', () => {
  const store = memoryStore();
  useGame.setState({ light: 50, settings: { ...g().settings, sound: false } });
  saveTo(store, T0);
  saveTo(store, T0 + 1);
  resetIn(store, T0 + 2);
  expect(g().light).toBe(0);
  expect(g().settings.sound).toBe(false);
  useGame.setState(initialGameState(T0));
  bootFrom(store, T0 + 3);
  expect(g().light).toBe(0);
  expect(g().settings.sound).toBe(false);
});

it('sıfırlama ve Şafak satın alımları korur; Başlangıç Paketi ×2 değer verir', () => {
  const store = memoryStore();
  const before = g().emptyJar(10, T0);
  useGame.setState(initialGameState(T0));
  g().setPurchases({ removeAds: true, starter: true });
  expect(g().emptyJar(10, T0)).toBeCloseTo(before * 2);
  resetIn(store, T0 + 1);
  expect(g().purchases).toEqual({ removeAds: true, starter: true });
  useGame.setState(initialGameState(T0));
  bootFrom(store, T0 + 2);
  expect(g().purchases.starter).toBe(true);
});

it('×2 güçlendirme kavanoz kazancını ikiye katlar ve kayıtta kalır', () => {
  const store = memoryStore();
  const normal = g().emptyJar(10, T0);
  g().startBoost(T0);
  expect(g().emptyJar(10, T0 + 1000)).toBeCloseTo(normal * 2);
  saveTo(store, T0 + 1000);
  useGame.setState(initialGameState(T0));
  bootFrom(store, T0 + 2000);
  expect(g().boostUntil).toBeGreaterThan(T0 + 2000);
});

import { OFFLINE, PRESTIGE, START, UPGRADES, ZONES, type UpgradeId } from '../config/balance';
import {
  bulkCost,
  canBuySkill,
  canPrestige,
  computeStats,
  globalMultiplier,
  jarPayout,
  maxAffordable,
  offlineEarnings,
  offlineSeconds,
  purchasePlan,
  stardustForPrestige,
  unlockedZoneCount,
  upgradeCost,
  zoneBrightness,
  type Levels,
  type Skills,
} from './economy';

const noLevels: Levels = { ring: 0, jar: 0, bright: 0, crowd: 0, spirit: 0, autoEmpty: 0, magnet: 0 };
const noSkills: Skills = {
  dawnRing: false,
  deepJar: false,
  keepAuto: false,
  longNight: false,
  kindredSpirit: false,
  starlight: false,
  dreamers: false,
};
const stats = (levels: Partial<Levels> = {}, skills: Partial<Skills> = {}, stardustEarned = 0, zoneIndex = 0) =>
  computeStats({ levels: { ...noLevels, ...levels }, skills: { ...noSkills, ...skills }, stardustEarned, zoneIndex });

describe('jarPayout / zoneBrightness', () => {
  it('sayı × değer × çarpan', () => {
    expect(jarPayout(10, 2, 4)).toBe(80);
    expect(jarPayout(0, 5, 5)).toBe(0);
    expect(jarPayout(-3, 5, 5)).toBe(0);
  });
  it('aydınlık logaritmik ve 0..1', () => {
    expect(zoneBrightness(0, 6)).toBe(0);
    expect(zoneBrightness(99, 6)).toBeCloseTo(2 / 6, 5);
    expect(zoneBrightness(1e12, 6)).toBe(1);
  });
});

describe('maliyetler', () => {
  it('taban * büyüme^n', () => {
    expect(upgradeCost('ring', 0)).toBe(10);
    expect(upgradeCost('ring', 2)).toBeCloseTo(10 * 1.15 ** 2);
    expect(upgradeCost('spirit', 0)).toBe(UPGRADES.spirit.baseCost);
  });
  it('toplu maliyet tek tek toplamla aynı', () => {
    const ids: UpgradeId[] = ['ring', 'jar', 'bright', 'crowd', 'spirit', 'magnet'];
    for (const id of ids) {
      let sum = 0;
      for (let k = 0; k < 10; k++) sum += upgradeCost(id, 5 + k);
      expect(bulkCost(id, 5, 10)).toBeCloseTo(sum, 6);
    }
  });
  it('maxAffordable sınırı doğru', () => {
    for (const light of [0, 9, 10, 100, 12_345, 1e9]) {
      const n = maxAffordable('ring', 3, light);
      expect(bulkCost('ring', 3, n)).toBeLessThanOrEqual(light);
      if (n < UPGRADES.ring.maxLevel - 3) expect(bulkCost('ring', 3, n + 1)).toBeGreaterThan(light);
    }
  });
  it('tek seferlik yükseltme bir kez alınır', () => {
    expect(maxAffordable('autoEmpty', 0, 1e12)).toBe(1);
    expect(maxAffordable('autoEmpty', 1, 1e12)).toBe(0);
  });
  it('×1 / ×10 / Maks planları', () => {
    expect(purchasePlan('ring', 0, 5, 1)).toEqual({ count: 1, cost: 10, affordable: false });
    expect(purchasePlan('ring', 0, 10, 1).affordable).toBe(true);
    const ten = purchasePlan('ring', 0, 1e6, 10);
    expect(ten.count).toBe(10);
    expect(ten.affordable).toBe(true);
    const max = purchasePlan('ring', 0, 100, 'max');
    expect(max.count).toBe(maxAffordable('ring', 0, 100));
    expect(max.affordable).toBe(true);
    // Maks alınamıyorsa bir sonraki seviyenin fiyatı gösterilir.
    expect(purchasePlan('ring', 0, 1, 'max')).toEqual({ count: 1, cost: 10, affordable: false });
  });
});

describe('statlar', () => {
  it('başlangıç değerleri', () => {
    const s = stats();
    expect(s.ringRadius).toBe(START.ringRadius);
    expect(s.jarCapacity).toBe(START.jarCapacity);
    expect(s.valuePerFirefly).toBe(1);
    expect(s.maxFireflies).toBe(START.maxFireflies);
    expect(s.spirits).toBe(0);
    expect(s.autoEmpty).toBe(false);
    expect(s.magnetRange).toBe(0);
  });
  it('yükseltme etkileri', () => {
    expect(stats({ ring: 1 }).ringRadius).toBeCloseTo(40 * 1.08);
    expect(stats({ jar: 2 }).jarCapacity).toBe(20);
    expect(stats({ jar: 11 }).jarCapacity).toBe(Math.floor(60 * 1.1));
    expect(stats({ bright: 3 }).valuePerFirefly).toBe(4);
    expect(stats({ crowd: 2 }).maxFireflies).toBe(50);
    expect(stats({ spirit: 3 }).spirits).toBe(3);
    expect(stats({ autoEmpty: 1 }).autoEmpty).toBe(true);
    expect(stats({ magnet: 1 }).magnetRange).toBeGreaterThan(stats().ringRadius);
  });
  it('halka üst sınırı aşmaz', () => {
    expect(stats({ ring: 60 }, { dawnRing: true }).ringRadius).toBeLessThanOrEqual(220);
  });
  it('bölge ve global çarpan değere yansır', () => {
    expect(stats({}, {}, 0, 1).valuePerFirefly).toBe(ZONES[1].multiplier);
    expect(stats({}, {}, 5).valuePerFirefly).toBeCloseTo(1.5);
    expect(globalMultiplier(10)).toBeCloseTo(2);
  });
  it('yetenekler', () => {
    expect(stats({}, { dawnRing: true }).ringRadius).toBeCloseTo(48);
    expect(stats({}, { deepJar: true }).jarCapacity).toBe(15);
    expect(stats({}, { kindredSpirit: true }).spirits).toBe(1);
    expect(stats({}, { starlight: true }).valuePerFirefly).toBe(2);
    expect(stats({}, { longNight: true }).offlineCapSeconds).toBe(OFFLINE.capSecondsLongNight);
  });
});

describe('bölgeler ve prestij', () => {
  it('bölge açılma eşikleri', () => {
    expect(unlockedZoneCount(0)).toBe(1);
    expect(unlockedZoneCount(4_999)).toBe(1);
    expect(unlockedZoneCount(5_000)).toBe(2);
    expect(unlockedZoneCount(2e8)).toBe(5);
  });
  it('Yıldız Tozu = floor(sqrt(ışık/1e6))', () => {
    expect(canPrestige(PRESTIGE.unlockAt - 1)).toBe(false);
    expect(stardustForPrestige(999_999)).toBe(0);
    expect(stardustForPrestige(1e6)).toBe(1);
    expect(stardustForPrestige(4e6)).toBe(2);
    expect(stardustForPrestige(1e8)).toBe(10);
  });
  it('yetenek ağacı ön koşulları', () => {
    expect(canBuySkill('dawnRing', noSkills, 1)).toBe(true);
    expect(canBuySkill('dawnRing', noSkills, 0)).toBe(false);
    expect(canBuySkill('deepJar', noSkills, 99)).toBe(false);
    expect(canBuySkill('deepJar', { ...noSkills, dawnRing: true }, 2)).toBe(true);
    expect(canBuySkill('dawnRing', { ...noSkills, dawnRing: true }, 99)).toBe(false);
  });
});

describe('offline', () => {
  const cap = OFFLINE.capSeconds;
  it('saat geri alınırsa 0', () => {
    expect(offlineSeconds(2_000_000, 1_000_000, cap)).toBe(0);
  });
  it('ileri alınırsa üst sınır', () => {
    expect(offlineSeconds(1, 1 + 1e10, cap)).toBe(cap);
  });
  it('geçersiz son görülme 0', () => {
    expect(offlineSeconds(0, Date.now(), cap)).toBe(0);
    expect(offlineSeconds(NaN, Date.now(), cap)).toBe(0);
  });
  it('ruh yoksa kazanç yok, varsa %50 oranında', () => {
    expect(offlineEarnings(stats(), 3600)).toBe(0);
    const s = stats({ spirit: 2 });
    const full = 2 * 0.6 * 1 * 3600;
    expect(offlineEarnings(s, 3600)).toBeCloseTo(full * 0.5);
    expect(offlineEarnings(stats({ spirit: 2 }, { dreamers: true }), 3600)).toBeCloseTo(full);
  });
});

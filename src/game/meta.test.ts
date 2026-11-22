import { COLLECTION, GARDEN, QUESTS } from '../config/balance';
import {
  ALL_RARES,
  claimableCount,
  collectionMultiplier,
  emptyCounters,
  emptyGarden,
  ensureDaily,
  gardenCost,
  gardenEffects,
  newDaily,
  questProgress,
  questsForDay,
  rareId,
  rollRare,
  tokensForEmpty,
} from './meta';
import { useGame } from './state';

describe('kavanoz jetonu', () => {
  it('doluluk oranı kadar, en fazla 1', () => {
    expect(tokensForEmpty(5, 10)).toBe(0.5);
    expect(tokensForEmpty(20, 10)).toBe(1);
    expect(tokensForEmpty(0, 10)).toBe(0);
  });
});

describe('Işık Bahçesi', () => {
  it('maliyet büyür, etkiler seviyeyle artar', () => {
    expect(gardenCost('lantern', 0)).toBe(GARDEN.lantern.baseCost);
    expect(gardenCost('lantern', 3)).toBeGreaterThan(gardenCost('lantern', 2));
    const e = gardenEffects({ ...emptyGarden(), lantern: 2, well: 3 });
    expect(e.value).toBeCloseTo(1.2);
    expect(e.golden).toBeCloseTo(1 - 3 * GARDEN.well.perLevel);
  });
});

describe('Koleksiyon', () => {
  it('yarıdan az dolu kavanozda nadir böcek çıkmaz, şans eşiği tutar', () => {
    expect(rollRare(0, 4, 10, 0, 0)).toBeNull();
    expect(rollRare(0, 10, 10, COLLECTION.chancePerJar + 0.01, 0)).toBeNull();
    expect(rollRare(0, 10, 10, 0, 0)).toBe('z1_0');
    expect(rollRare(2, 10, 10, 0, 0.999)).toBe('z3_2');
  });
  it('set çarpanları', () => {
    const zone1 = { [rareId(0, 0)]: 1, [rareId(0, 1)]: 1, [rareId(0, 2)]: 1 };
    expect(collectionMultiplier(zone1, 0)).toBe(COLLECTION.zoneSetMult);
    expect(collectionMultiplier(zone1, 1)).toBe(1);
    const all = Object.fromEntries(ALL_RARES.map((id) => [id, 1]));
    expect(collectionMultiplier(all, 1)).toBeCloseTo(COLLECTION.zoneSetMult * COLLECTION.allSetMult);
  });
});

describe('Günlük görevler', () => {
  it('gün başına 3 farklı türde görev, aynı gün aynı görevler', () => {
    const q = questsForDay('2026-11-22');
    expect(q).toHaveLength(QUESTS.perDay);
    expect(new Set(q.map((i) => QUESTS.templates[i]!.kind)).size).toBe(QUESTS.perDay);
    expect(questsForDay('2026-11-22')).toEqual(q);
  });
  it('ilerleme gün başından sayılır; gün değişince yenilenir', () => {
    const now = new Date(2026, 10, 22, 12).getTime();
    const d = newDaily(now, { ...emptyCounters(), jarsFilled: 100 });
    const c = { ...emptyCounters(), jarsFilled: 200, goldenCaught: 5, upgradesBought: 99, raresFound: 3, playTimeSec: 3600 };
    d.quests.forEach((_, i) => expect(questProgress(d, i, c).done).toBe(true));
    expect(claimableCount(d, c)).toBe(3);
    expect(ensureDaily(d, now + 1000, c)).toBe(d);
    expect(ensureDaily(d, now + 24 * 3600 * 1000, c)).not.toBe(d);
  });
});

describe('durum entegrasyonu', () => {
  beforeEach(() => useGame.getState().resetProgress(Date.now()));
  it('boşaltma jeton verir, nadir böcek koleksiyona girer, Şafak koleksiyonu silmez', () => {
    const g = useGame.getState;
    const cap = 10;
    g().emptyJar(cap, Date.now(), 0, 0);
    expect(g().jarTokens).toBeGreaterThan(0);
    expect(g().jarsFilled).toBe(1);
    expect(g().collection['z1_0']).toBe(1);
    expect(g().lastRare?.id).toBe('z1_0');
    useGame.setState({ runLight: 2e6 });
    g().prestige();
    expect(g().collection['z1_0']).toBe(1);
  });
  it('bahçe jetonla alınır', () => {
    const g = useGame.getState;
    useGame.setState({ jarTokens: 100 });
    expect(g().buyGarden('lantern')).toBe(true);
    expect(g().garden.lantern).toBe(1);
    expect(g().jarTokens).toBe(100 - GARDEN.lantern.baseCost);
  });
  it('görev ödülü ve sandık', () => {
    const g = useGame.getState;
    const now = Date.now();
    g().refreshDaily(now);
    useGame.setState({ jarsFilled: 999, goldenCaught: 9, upgradesBought: 999, raresFound: 9, playTimeSec: 99999 });
    const before = g().jarTokens;
    for (let i = 0; i < 3; i++) expect(g().claimQuest(i)).toBeGreaterThan(0);
    expect(g().claimQuest(0)).toBe(0);
    expect(g().claimChest(now)).toBe(QUESTS.chestTokens);
    expect(g().jarTokens).toBeGreaterThan(before);
    expect(g().boostUntil).toBeGreaterThan(now);
  });
});

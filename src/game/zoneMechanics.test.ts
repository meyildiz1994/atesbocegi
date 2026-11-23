import { BOSS, FOG, KIND, MUSHROOM, PERKS, WIND, ZONES } from '../config/balance';
import { createSimState, seedFireflies, spawnWindGust, stepSimulation, STATUS_DEAD, STATUS_FLYING, STATUS_FREE } from './simulation';
import {
  bossDue,
  bossGoal,
  chainOrder,
  crystalWeights,
  emptyPerks,
  fogBand,
  fogRingScale,
  isPerfectTap,
  nextThreshold,
  perkChoices,
  perkEffects,
  perkOfferAt,
  starCost,
  starEffects,
  windGustIndex,
} from './zoneMechanics';

const params = {
  width: 400,
  height: 800,
  maxFireflies: 0,
  spawnRate: 0,
  ringRadius: 60,
  jarCapacity: 1000,
  jarCount: 0,
  jarX: 200,
  jarY: 760,
  fingerActive: false,
  fingerX: 0,
  fingerY: 0,
  spirits: 0,
  spiritSpeed: 0,
  magnetRange: 0,
  magnetPull: 0,
};

describe('sis', () => {
  it('ilk gecikmeden önce sis yok, sonra soldan sağa geçer', () => {
    expect(fogBand(FOG.firstDelay - 1, 400)).toEqual([0, 0]);
    const a = fogBand(FOG.firstDelay + 1, 400);
    const b = fogBand(FOG.firstDelay + FOG.duration / 2, 400);
    expect(a[1]).toBeGreaterThan(a[0]);
    expect(b[0]).toBeGreaterThan(a[0]);
    expect(fogBand(FOG.firstDelay + FOG.duration + 1, 400)).toEqual([0, 0]);
  });
  it('Fener seviyesi halkayı büyütür, fener kabı sisten etkilenmez', () => {
    expect(fogRingScale(0, false)).toBeCloseTo(FOG.ringScale);
    expect(fogRingScale(5, false)).toBeGreaterThan(fogRingScale(0, false));
    expect(fogRingScale(0, true)).toBe(1);
  });
  it('sisin içindeki böcek küçük halkaya yakalanmaz', () => {
    const s = createSimState(10, 1);
    seedFireflies(s, 1, 400, 800);
    s.x[0] = 100;
    s.y[0] = 300;
    s.speed[0] = 0;
    s.fogL = 0;
    s.fogR = 300;
    stepSimulation(s, 0.016, { ...params, fingerActive: true, fingerX: 145, fingerY: 300, fogRingScale: 0.4 });
    expect(s.status[0]).toBe(STATUS_FREE);
    stepSimulation(s, 0.016, { ...params, fingerActive: true, fingerX: 110, fingerY: 300, fogRingScale: 0.4 });
    expect(s.status[0]).toBe(STATUS_FLYING);
    expect(s.caughtKind[KIND.normal]).toBe(1);
  });
});

describe('rüzgâr', () => {
  it('ilk rüzgâr gecikmeden sonra, sonra her periyotta', () => {
    expect(windGustIndex(WIND.firstDelay - 0.1)).toBe(-1);
    expect(windGustIndex(WIND.firstDelay)).toBe(0);
    expect(windGustIndex(WIND.firstDelay + WIND.period)).toBe(1);
  });
  it('rüzgâr böcekleri soldan girer, ekrandan çıkınca kaybolur', () => {
    const s = createSimState(20, 2);
    expect(spawnWindGust(s, 3, 400, 800)).toBe(3);
    const ids = [0, 1, 2];
    ids.forEach((i) => expect(s.kind[i]).toBe(KIND.wind));
    for (let k = 0; k < 400; k++) stepSimulation(s, 0.05, params);
    ids.forEach((i) => expect(s.status[i]).toBe(STATUS_DEAD));
  });
});

describe('mantar', () => {
  it('zincir yakındaki olgun mantarlara sıçrar', () => {
    const pos: [number, number][] = [
      [0, 0],
      [200, 0],
      [400, 0],
      [2000, 0],
    ];
    const order = chainOrder(0, [true, true, true, true], pos);
    expect(order.map(([i]) => i)).toEqual([0, 1, 2]);
    expect(order[2]![1]).toBe(2);
  });
  it('halka kapanırken dokunuş tam zamanında sayılır', () => {
    expect(isPerfectTap(MUSHROOM.pulsePeriod * 0.99)).toBe(true);
    expect(isPerfectTap(MUSHROOM.pulsePeriod * 0.5)).toBe(false);
  });
  it('patlama yarıçaptaki böcekleri kavanoza yollar', () => {
    const s = createSimState(10, 3);
    seedFireflies(s, 2, 400, 800);
    s.x[0] = 100;
    s.y[0] = 100;
    s.x[1] = 350;
    s.y[1] = 500;
    s.speed[0] = s.speed[1] = 0;
    s.pulseN = 1;
    s.pulseX[0] = 100;
    s.pulseY[0] = 100;
    s.pulseR[0] = 50;
    stepSimulation(s, 0.016, params);
    expect(s.status[0]).toBe(STATUS_FLYING);
    expect(s.status[1]).toBe(STATUS_FREE);
  });
  it('negatif yarıçap: combo patlaması böcekleri yerinde patlatır ve sayar', () => {
    const s = createSimState(10, 4);
    seedFireflies(s, 3, 400, 800);
    for (let i = 0; i < 3; i++) {
      s.x[i] = 200;
      s.y[i] = 300;
      s.speed[i] = 0;
    }
    s.pulseN = 1;
    s.pulseX[0] = 200;
    s.pulseY[0] = 300;
    s.pulseR[0] = -80;
    stepSimulation(s, 0.016, params);
    expect(s.lastPopped).toBe(3);
  });
});

describe('kristal, boss, yükseltmeler', () => {
  it('kıt renk düşük ağırlık alır', () => {
    expect(crystalWeights(1)[1]).toBeLessThan(crystalWeights(1)[0]);
  });
  it('boss sınır eşiğinin %60ında gelir ve bir kez yenilir', () => {
    const next = nextThreshold(1);
    expect(next).toBe(ZONES[2]!.unlockAt);
    expect(bossDue(1, next * BOSS.appearAt - 1, [])).toBe(false);
    expect(bossDue(1, next * BOSS.appearAt, [])).toBe(true);
    expect(bossDue(1, next, [1])).toBe(false);
    expect(bossGoal(0)).toBe(BOSS.minGoal);
  });
  it('kart teklifleri iki farklı dal ve büyüyen aralık', () => {
    const c = perkChoices(emptyPerks(), 0.1, 0.9);
    expect(c).toHaveLength(2);
    expect(c[0]).not.toBe(c[1]);
    expect(perkOfferAt(1) - perkOfferAt(0)).toBeLessThan(perkOfferAt(2) - perkOfferAt(1));
    const full = Object.fromEntries(Object.entries(PERKS).map(([k, v]) => [k, v.maxTier]));
    expect(perkChoices(full, 0.5, 0.5)).toEqual([]);
  });
  it('Ruh 3. basamak yeni ruh verir', () => {
    expect(perkEffects({ spirit: 2 }).bonusSpirits).toBe(0);
    expect(perkEffects({ spirit: 3 }).bonusSpirits).toBe(1);
  });
  it('Yıldız yükseltmeleri sınırsız, maliyet artar', () => {
    expect(starCost('starGlow', 5)).toBeGreaterThan(starCost('starGlow', 4));
    expect(starEffects({ starGlow: 4 }).value).toBeCloseTo(2);
    expect(starEffects({ starHead: 0 }).headStart).toBe(0);
  });
});

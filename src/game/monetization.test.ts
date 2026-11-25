import { GOLDEN, MONETIZATION } from '../config/balance';
import {
  adsAllowed,
  boostMultiplier,
  canShowInterstitial,
  extendBoost,
  goldenFreeReward,
  goldenReward,
  nextGoldenAt,
  purchaseMultiplier,
  starterDiscountActive,
} from './monetization';

const T = 1_700_000_000_000;
const MIN = 60_000;

it('ilk 10 dakikada reklam yok', () => {
  expect(adsAllowed(9 * 60)).toBe(false);
  expect(adsAllowed(10 * 60)).toBe(true);
});

it('geçiş reklamı: 4. dk sonrası, 4 dk arayla, Reklamları Kaldır ile hiç', () => {
  const base = { nowMs: T, playTimeSec: 20 * 60, lastInterstitialAt: 0, removeAds: false };
  expect(canShowInterstitial(base)).toBe(true);
  expect(canShowInterstitial({ ...base, playTimeSec: 3 * 60 })).toBe(false);
  expect(canShowInterstitial({ ...base, lastInterstitialAt: T - 3 * MIN })).toBe(false);
  expect(canShowInterstitial({ ...base, lastInterstitialAt: T - 4 * MIN })).toBe(true);
  expect(canShowInterstitial({ ...base, removeAds: true })).toBe(false);
});

it('×2 güçlendirme 2 dk sürer ve üst üste eklenir', () => {
  const until = extendBoost(T, 0);
  expect(until).toBe(T + MONETIZATION.boostSeconds * 1000);
  expect(boostMultiplier(T + 1000, until)).toBe(2);
  expect(boostMultiplier(until, until)).toBe(1);
  expect(extendBoost(T + 1000, until)).toBe(until + MONETIZATION.boostSeconds * 1000);
});

it('Başlangıç Paketi: kalıcı ×2, indirim ilk 48 saat', () => {
  expect(purchaseMultiplier({ removeAds: false, starter: true, vip: false })).toBe(2);
  expect(purchaseMultiplier({ removeAds: true, starter: false, vip: false })).toBe(1);
  expect(starterDiscountActive(T, T + 47 * 3600_000)).toBe(true);
  expect(starterDiscountActive(T, T + 49 * 3600_000)).toBe(false);
});

it('Altın Ateşböceği aralığı ve ödülü', () => {
  expect(nextGoldenAt(T, 0)).toBe(T + GOLDEN.minIntervalSec * 1000);
  expect(nextGoldenAt(T, 1)).toBe(T + GOLDEN.maxIntervalSec * 1000);
  const stats = { jarCapacity: 10, valuePerFirefly: 2 };
  expect(goldenReward(0, stats)).toBe(10 * 2 * GOLDEN.minRewardJars);
  expect(goldenReward(1000, stats)).toBe(1000 * GOLDEN.rewardSeconds);
  expect(goldenFreeReward(100)).toBeCloseTo(100 * GOLDEN.freeShare);
});

test('Gece Işığı aboneliği ×1.5 ve Başlangıç ile çarpılır', () => {
  expect(purchaseMultiplier({ removeAds: true, starter: true, vip: true })).toBe(3);
});

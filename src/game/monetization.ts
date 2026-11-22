/** Reklam zamanlaması, güçlendirme ve Altın Ateşböceği kuralları. Saf. */
import { GOLDEN, MONETIZATION } from '../config/balance';
import type { Stats } from './economy';

export type Purchases = { removeAds: boolean; starter: boolean };

export const noPurchases = (): Purchases => ({ removeAds: false, starter: false });

/** İlk 10 dakikada (oyun süresi) hiçbir reklam teklif edilmez. */
export function adsAllowed(playTimeSec: number): boolean {
  return playTimeSec >= MONETIZATION.noAdsBeforeSec;
}

/** Geçiş reklamı yalnızca bölge geçişinde, 15. dakikadan sonra, en fazla 5 dakikada bir. */
export function canShowInterstitial(p: {
  nowMs: number;
  playTimeSec: number;
  lastInterstitialAt: number;
  removeAds: boolean;
}): boolean {
  if (p.removeAds) return false;
  if (p.playTimeSec < MONETIZATION.interstitialAfterSec) return false;
  return p.nowMs - p.lastInterstitialAt >= MONETIZATION.interstitialMinGapSec * 1000;
}

/** Ödüllü güçlendirme etkinse çarpan, değilse 1. */
export function boostMultiplier(nowMs: number, boostUntil: number): number {
  return nowMs < boostUntil ? MONETIZATION.boostMultiplier : 1;
}

/** Yeni güçlendirme bitişi: etkin olanın üstüne eklenir. */
export function extendBoost(nowMs: number, boostUntil: number): number {
  return Math.max(nowMs, boostUntil) + MONETIZATION.boostSeconds * 1000;
}

/** Satın alımlardan gelen kalıcı Işık çarpanı. */
export function purchaseMultiplier(p: Purchases): number {
  return p.starter ? MONETIZATION.starterMultiplier : 1;
}

/** Başlangıç Paketi indirimli mi (ilk 48 saat)? */
export function starterDiscountActive(firstLaunchAt: number, nowMs: number): boolean {
  return nowMs - firstLaunchAt < MONETIZATION.starterDiscountHours * 3600 * 1000;
}

/** Bir sonraki Altın Ateşböceği ne zaman (ms)? `rand` 0..1. */
export function nextGoldenAt(nowMs: number, rand: number): number {
  const span = GOLDEN.maxIntervalSec - GOLDEN.minIntervalSec;
  return nowMs + (GOLDEN.minIntervalSec + span * Math.min(1, Math.max(0, rand))) * 1000;
}

/** Altın Ateşböceği ödülü (reklamla). Son Işık/sn'ye dayanır, en az birkaç dolu kavanoz. */
export function goldenReward(lightPerSecond: number, stats: Pick<Stats, 'jarCapacity' | 'valuePerFirefly'>): number {
  const floor = stats.jarCapacity * stats.valuePerFirefly * GOLDEN.minRewardJars;
  return Math.max(lightPerSecond * GOLDEN.rewardSeconds, floor);
}

/** Reklamsız alınırsa ödül. */
export function goldenFreeReward(fullReward: number): number {
  return fullReward * GOLDEN.freeShare;
}

/**
 * Reklam servisi, web ve test sürümü: reklam yok. Gerçek uygulama `ads.native.ts`'i kullanır.
 * "Reklamları Kaldır" sahipleri ödülleri reklamsız alır (iki sürümde de).
 */
import { useGame } from '../game/state';

export async function initAds(): Promise<void> {}

export function useRewardedReady(): boolean {
  return useGame((s) => s.purchases.removeAds);
}

export async function showRewarded(_placement: string): Promise<boolean> {
  return useGame.getState().purchases.removeAds;
}

export async function maybeShowInterstitial(): Promise<void> {}

export function privacyOptionsRequired(): boolean {
  return false;
}

export async function showPrivacyOptions(): Promise<void> {}

/**
 * Reklam servisi (Faz 8'de AdMob ile doldurulacak). Şimdilik ödüllü reklam yok.
 */
export function isRewardedAvailable(): boolean {
  return false;
}

/** Ödüllü reklam gösterir; izlenirse true. */
export async function showRewarded(_placement: string): Promise<boolean> {
  return false;
}

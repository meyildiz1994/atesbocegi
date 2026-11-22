/**
 * Ekonomi formülleri. Saf fonksiyonlar; render ya da React'e bağımlı değil.
 * Faz 3'te yükseltme maliyetleri, prestij ve offline kazanç eklenecek.
 */

/** Kavanoz boşaltılınca kazanılan Işık. */
export function jarPayout(count: number, valuePerFirefly: number, multiplier: number): number {
  if (count <= 0) return 0;
  return count * valuePerFirefly * multiplier;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Bölgenin aydınlık seviyesi (0..1):
 * brightness = clamp(log10(bölgedeToplananIşık + 1) / hedefLog, 0, 1)
 */
export function zoneBrightness(zoneLight: number, targetLog: number): number {
  if (targetLog <= 0) return 1;
  return clamp(Math.log10(Math.max(0, zoneLight) + 1) / targetLog, 0, 1);
}

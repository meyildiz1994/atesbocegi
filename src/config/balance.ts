/**
 * Tüm oyun dengesi sayıları burada durur. Koda sihirli sayı gömme.
 * Faz 1: yalnızca renkler ve geliştirme ayarları. Ekonomi değerleri Faz 2-3'te eklenecek.
 */

export const COLORS = {
  background: '#05070d',
  backgroundTop: '#0a1020',
  firefly: '#d8ff6a',
  hudText: '#e8f0ff',
  debugText: '#7CFC9A',
} as const;

export const DEV = {
  /** FPS sayacının ekrandaki değeri kaç ms'de bir güncellensin. */
  fpsOverlayUpdateMs: 500,
} as const;

export const NUMBER_FORMAT = {
  /** Bu değerin altındaki sayılar kısaltılmadan gösterilir. */
  abbreviateFrom: 1000,
  /** K, M, B, T sonrası aa, ab, … notasyonu başlar. */
  suffixes: ['', 'K', 'M', 'B', 'T'],
  decimals: 1,
} as const;

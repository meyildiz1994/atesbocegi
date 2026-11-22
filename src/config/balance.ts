/**
 * Tüm oyun dengesi ve ayar sayıları burada durur. Koda sihirli sayı gömme.
 */

export const COLORS = {
  background: '#05070d',
  backgroundTop: '#0a1020',
  /** Aydınlık 1'e yaklaşırken arka planın ulaştığı renkler (üst, alt). */
  backgroundLitTop: '#1d3a4a',
  backgroundLit: '#0f2a2a',
  firefly: '#d8ff6a',
  ring: '#fff4b0',
  jarGlass: '#9fb8c8',
  jarGlow: '#e8ff9a',
  hudText: '#e8f0ff',
  hudSubText: '#8fa3b8',
  floatingNumber: '#f4ffb0',
  debugText: '#7CFC9A',
  treeFar: '#0b1622',
  treeMid: '#08111a',
  treeNear: '#04080d',
  /** Ağaç kenarlarına vuran ışık. */
  treeRim: '#3d5a3a',
  grass: '#03060a',
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

/** Oyuna başlarken geçerli olan değerler (yükseltmesiz). */
export const START = {
  ringRadius: 40,
  jarCapacity: 10,
  valuePerFirefly: 1,
  maxFireflies: 30,
  /** Saniyede kaç yeni ateşböceği doğar (eksik varsa). */
  spawnRate: 1.5,
} as const;

/** Ateşböceği simülasyonu. */
export const SIM = {
  /** Aynı anda tutulabilecek en fazla ateşböceği (buffer boyutu). */
  capacity: 1600,
  /** Süzülme hızı aralığı (px/sn). */
  speedMin: 14,
  speedMax: 32,
  /** Yön değişiminin yumuşaklığı (rad/sn). */
  turnRate: 1.6,
  /** Kenara bu kadar yaklaşınca merkeze doğru döner (px). */
  edgeMargin: 40,
  /** Oyun alanının alt sınırı: ekran yüksekliğinin bu oranı (kavanozun üstü). */
  playAreaBottom: 0.78,
  /** Yanıp sönme döngüsü (sn). */
  blinkPeriodMin: 1.5,
  blinkPeriodMax: 4,
  /** Sönükken en düşük parlaklık. */
  blinkFloor: 0.25,
  /** Doğarken parlaklığın açılma süresi (sn). */
  fadeInTime: 0.8,
  /** Kavanoza uçuş süresi (sn). */
  flightTime: 0.55,
  /** Uçuş kavisinin yüksekliği (px). */
  flightArc: 140,
  /** Ekranda çizilen boyut (px). */
  spriteSize: 40,
  /** Glow dokusunun çözünürlüğü (px). */
  textureSize: 64,
  /** Simülasyon adımında en fazla dt (sn); takılmalarda zıplamayı önler. */
  maxDt: 0.05,
} as const;

/** Kavanoz ve dokunma. */
export const JAR = {
  width: 76,
  height: 96,
  /** Kavanoz merkezinin ekran altından uzaklığı (px, güvenli alan hariç). */
  bottomOffset: 70,
  /** Dolu kavanozun nefes alma döngüsü (sn) ve genliği. */
  pulsePeriod: 1.2,
  pulseScale: 0.06,
  /** Dolu kavanozun titreme genliği (px). */
  shakeAmplitude: 2.5,
} as const;

export const RING = {
  /** Halka parmak kalkınca ne kadar sürede kaybolur (sn). */
  fadeOutTime: 0.25,
  opacity: 0.35,
} as const;

export const FEEDBACK = {
  /** Saniyede en fazla haptic sayısı (seri toplamada). */
  maxHapticsPerSecond: 15,
  /** Uçan sayının ömrü (ms) ve yükselme mesafesi (px). */
  floatingNumberMs: 1100,
  floatingNumberRise: 90,
} as const;

export const UI = {
  /** HUD (React) en fazla saniyede kaç kez güncellenir. */
  hudUpdatesPerSecond: 10,
} as const;

/** Bölgeler. Faz 3'te tamamı açılacak; şimdilik yalnız ilk bölge oynanır. */
export const ZONES = [
  { id: 1, unlockAt: 0, multiplier: 1, fireflyColor: '#d8ff6a', targetLog: 6 },
  { id: 2, unlockAt: 5_000, multiplier: 4, fireflyColor: '#b8ffd0', targetLog: 8 },
  { id: 3, unlockAt: 150_000, multiplier: 15, fireflyColor: '#ffd27a', targetLog: 10 },
  { id: 4, unlockAt: 5_000_000, multiplier: 60, fireflyColor: '#c8a8ff', targetLog: 12 },
  { id: 5, unlockAt: 200_000_000, multiplier: 250, fireflyColor: '#ffb070', targetLog: 14 },
] as const;

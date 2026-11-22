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
  panelBg: '#0b131cf5',
  panelBorder: '#23344a',
  cardBg: '#132030',
  cardBgAffordable: '#1a2e22',
  accent: '#d8ff6a',
  accentText: '#0a1008',
  disabled: '#4a5866',
  stardust: '#c8b8ff',
  dawn: '#fff6e0',
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
  spawnRate: 2.5,
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

/** İlk dakikalar (onboarding). Adımlar: src/game/tutorial.ts */
export const TUTORIAL = {
  /** İlk adımda ekranda tek bir böcek. */
  firstFireflies: 1,
  /** İlk toplamadan sonra, kavanoz ilk kez boşalana kadar. */
  earlyFireflies: 6,
  /** İpucu parmağının sürükleme animasyonu süresi (ms). */
  fingerLoopMs: 1600,
  /** Parmağın sürükleme mesafesi (px). */
  fingerTravel: 90,
} as const;

/** Başsız denge simülasyonundaki sanal oyuncu (scripts/simulate-economy.ts). */
export const BOT = {
  defaultMinutes: 300,
  dt: 0.05,
  /** iPhone 15 boyutu (pt). */
  screenWidth: 393,
  screenHeight: 852,
  jarFromBottom: 104,
  /** Parmağın en yakın böceğe doğru sürüklenme hızı (pt/sn). */
  fingerSpeed: 700,
  /** Kavanoz dolduktan sonra dokunma gecikmesi (sn). */
  tapDelay: 0.8,
  decisionInterval: 1,
  maxBuysPerDecision: 20,
  /** Botun verim tahmini: bu yarıçapta (pt) doğan her böcek yakalanır sayılır. */
  ringForFullCatch: 90,
  magnetWeight: 0.5,
  /** Kalabalık ormanın yakalamayı kolaylaştırma etkisi (kaba). */
  crowdBonusDivisor: 300,
} as const;

export const UI = {
  /** HUD (React) en fazla saniyede kaç kez güncellenir. */
  hudUpdatesPerSecond: 10,
  /** Dokunma hedefi en küçük boyut (pt). */
  minTouch: 44,
  sheetMaxHeightRatio: 0.72,
  /** Şafak beyaz parlama süresi (ms). */
  dawnFlashMs: 2200,
} as const;

/**
 * Yükseltmeler. Maliyet: taban * büyüme^seviye.
 * Etkiler `economy.ts` içindeki `computeStats` ile hesaplanır.
 */
export const UPGRADES = {
  ring: { baseCost: 10, growth: 1.15, maxLevel: 60 },
  jar: { baseCost: 25, growth: 1.2, maxLevel: 200 },
  bright: { baseCost: 50, growth: 1.35, maxLevel: 300 },
  crowd: { baseCost: 100, growth: 1.25, maxLevel: 150 },
  spirit: { baseCost: 500, growth: 1.5, maxLevel: 60 },
  autoEmpty: { baseCost: 2_000, growth: 1, maxLevel: 1 },
  magnet: { baseCost: 5_000, growth: 1.4, maxLevel: 40 },
} as const;

export type UpgradeId = keyof typeof UPGRADES;
export const UPGRADE_ORDER: UpgradeId[] = ['ring', 'jar', 'bright', 'crowd', 'spirit', 'autoEmpty', 'magnet'];

/** Yükseltme etkilerinin sayıları. */
export const EFFECTS = {
  /** Işık Halkası: seviye başına yarıçap çarpanı. */
  ringPerLevel: 1.08,
  /** Yarıçap üst sınırı (px); ekranı tamamen kaplamasın. */
  ringMax: 220,
  /** Büyük Kavanoz: ilk N seviye +5, sonrası ×1.1. */
  jarFlatLevels: 10,
  jarFlatStep: 5,
  jarPctAfter: 1.1,
  /** Parlak Böcekler: ilk N seviye +1, sonrası ×1.1. */
  brightFlatLevels: 10,
  brightFlatStep: 1,
  brightPctAfter: 1.1,
  /** Kalabalık Orman: seviye başına +10 böcek, doğma hızı ×1.1. */
  crowdFireflies: 10,
  crowdSpawnMult: 1.1,
  /** Mıknatıs: çekim alanı = halka yarıçapı × (taban + seviye × artış), çekim hızı px/sn. */
  magnetRangeBase: 1.6,
  magnetRangePerLevel: 0.15,
  magnetPullSpeed: 90,
  magnetPullPerLevel: 6,
} as const;

/** Işık Ruhu (otomatik toplayıcı). */
export const SPIRIT = {
  radius: 28,
  speed: 70,
  turnRate: 2.2,
  /** Ekranda en fazla çizilecek ruh (fazlası üretime sayılır, çizilmez). */
  maxOnScreen: 40,
  /** Offline hesap için bir ruhun saniyede ortalama yakaladığı böcek. */
  catchesPerSecond: 0.6,
  color: '#9fe8ff',
  spriteSize: 54,
} as const;

/** Prestij: Şafak. */
export const PRESTIGE = {
  /** Bu koşudaki toplam Işık bu değeri geçince açılır. */
  unlockAt: 1_000_000,
  /** Yıldız Tozu = floor(sqrt(koşuIşığı / divisor)). */
  divisor: 1_000_000,
  /** Kazanılmış her Yıldız Tozu kalıcı global çarpana eklenir. */
  multPerStardust: 0.1,
} as const;

/** Yıldız Tozu yetenek ağacı. `requires` önce açılması gereken düğüm. */
export const SKILLS = {
  dawnRing: { cost: 1, requires: null },
  deepJar: { cost: 2, requires: 'dawnRing' },
  keepAuto: { cost: 3, requires: 'deepJar' },
  longNight: { cost: 3, requires: 'dawnRing' },
  kindredSpirit: { cost: 5, requires: 'longNight' },
  starlight: { cost: 8, requires: 'keepAuto' },
  dreamers: { cost: 12, requires: 'kindredSpirit' },
} as const;

export type SkillId = keyof typeof SKILLS;
export const SKILL_ORDER: SkillId[] = ['dawnRing', 'deepJar', 'keepAuto', 'longNight', 'kindredSpirit', 'starlight', 'dreamers'];

export const SKILL_EFFECTS = {
  /** dawnRing: halka ×1.2 */
  dawnRingMult: 1.2,
  /** deepJar: kavanoz ×1.5 */
  deepJarMult: 1.5,
  /** kindredSpirit: her koşuya 1 ruhla başla, ruhlar ×1.5 hızlı */
  kindredSpiritSpeed: 1.5,
  /** starlight: böcek değeri ×2 */
  starlightMult: 2,
} as const;

/** Offline kazanç. */
export const OFFLINE = {
  /** Ruh üretiminin offline'da biriken oranı; dreamers ile yükselir. */
  rate: 0.5,
  rateDreamers: 1,
  /** Üst sınır (sn); longNight ile 8 saate çıkar. */
  capSeconds: 2 * 3600,
  capSecondsLongNight: 8 * 3600,
  /** Bu süreden kısa yokluklarda panel gösterilmez (sn). */
  minSecondsForPanel: 60,
} as const;

/** Bölgeler. Açılma eşiği bu koşudaki toplam Işık'a bakar. */
export const ZONES = [
  { id: 1, unlockAt: 0, multiplier: 1, fireflyColor: '#d8ff6a', targetLog: 6, bgTop: '#0a1020', bgLitTop: '#1d3a4a' },
  { id: 2, unlockAt: 5_000, multiplier: 4, fireflyColor: '#b8ffd0', targetLog: 8, bgTop: '#0a1418', bgLitTop: '#2a4a48' },
  { id: 3, unlockAt: 150_000, multiplier: 15, fireflyColor: '#ffd27a', targetLog: 10, bgTop: '#120c18', bgLitTop: '#3a2a4a' },
  { id: 4, unlockAt: 5_000_000, multiplier: 60, fireflyColor: '#c8a8ff', targetLog: 12, bgTop: '#0c0a1e', bgLitTop: '#2a2a5a' },
  { id: 5, unlockAt: 200_000_000, multiplier: 250, fireflyColor: '#ffb070', targetLog: 14, bgTop: '#080c1e', bgLitTop: '#3a3060' },
] as const;

/** Kayıt. */
export const SAVE = {
  version: 1,
  autosaveSeconds: 10,
  key: 'atesbocegi.save',
} as const;

/** Işık/sn göstergesi için kayan pencere (sn). */
export const RATE_WINDOW_SECONDS = 10;

/**
 * Kavanozlarla ilerleme (saf): kavanoz jetonları, Işık Bahçesi, Koleksiyon ve Günlük Görevler.
 * Hepsi Şafak'ta korunur.
 */
import {
  COLLECTION,
  GARDEN,
  GARDEN_ORDER,
  JAR_TOKENS,
  QUESTS,
  ZONES,
  type GardenId,
  type QuestKind,
} from '../config/balance';

export type GardenLevels = Record<GardenId, number>;

/** Kalıcı sayaçlar (görev ilerlemesi bunların gün başına göre farkından hesaplanır). */
export type MetaCounters = {
  jarsFilled: number;
  goldenCaught: number;
  upgradesBought: number;
  raresFound: number;
  playTimeSec: number;
};

export type DailyState = {
  /** Yerel tarih (YYYY-MM-DD). */
  day: string;
  /** Günün başındaki sayaçlar. */
  base: MetaCounters;
  /** Bugünün görevleri (QUESTS.templates sırası). */
  quests: number[];
  claimed: boolean[];
  chestClaimed: boolean;
};

export const emptyGarden = (): GardenLevels => Object.fromEntries(GARDEN_ORDER.map((id) => [id, 0])) as GardenLevels;

export const emptyCounters = (): MetaCounters => ({
  jarsFilled: 0,
  goldenCaught: 0,
  upgradesBought: 0,
  raresFound: 0,
  playTimeSec: 0,
});

// ---------------------------------------------------------------------------
// Kavanoz jetonu

/** Bir boşaltmanın verdiği jeton: doluluk oranı (0..1). */
export function tokensForEmpty(count: number, capacity: number): number {
  if (count <= 0 || capacity <= 0) return 0;
  return Math.min(1, count / capacity);
}

/** "Kavanoz doldur" görevine sayılır mı? */
export function countsAsFilled(count: number, capacity: number): boolean {
  return capacity > 0 && count / capacity >= JAR_TOKENS.questMinFill;
}

// ---------------------------------------------------------------------------
// Işık Bahçesi

export function gardenCost(id: GardenId, level: number): number {
  const g = GARDEN[id];
  return Math.ceil(g.baseCost * Math.pow(g.growth, level));
}

export function gardenMaxed(id: GardenId, level: number): boolean {
  return level >= GARDEN[id].maxLevel;
}

export type GardenEffects = {
  /** Işık çarpanı (Fener). */
  value: number;
  /** Offline kazanç çarpanı (Mantar Ev). */
  offline: number;
  /** Kavanoz kapasitesi çarpanı (Köprü). */
  jar: number;
  /** Altın böcek bekleme süresi çarpanı (Dilek Kuyusu; küçük = daha sık). */
  golden: number;
  /** Işık Ruhu hız çarpanı (Işık Ağacı). */
  spirit: number;
};

export function gardenEffects(g: Partial<GardenLevels> | undefined): GardenEffects {
  const l = { ...emptyGarden(), ...g };
  return {
    value: 1 + GARDEN.lantern.perLevel * l.lantern,
    offline: 1 + GARDEN.mushroomHouse.perLevel * l.mushroomHouse,
    jar: 1 + GARDEN.bridge.perLevel * l.bridge,
    golden: Math.max(0.3, 1 - GARDEN.well.perLevel * l.well),
    spirit: 1 + GARDEN.tree.perLevel * l.tree,
  };
}

/** Bahçenin aydınlığı (0..1): toplam seviye / toplam en yüksek seviye. */
export function gardenProgress(g: GardenLevels): number {
  let sum = 0;
  let max = 0;
  for (const id of GARDEN_ORDER) {
    sum += g[id];
    max += GARDEN[id].maxLevel;
  }
  return max > 0 ? sum / max : 0;
}

// ---------------------------------------------------------------------------
// Koleksiyon

export const RARE_PER_ZONE = 3;

/** Nadir böcek kimliği: "z{bölge}_{tür}" (bölge 1..5, tür 0..2). */
export function rareId(zoneIndex: number, kind: number): string {
  return `z${zoneIndex + 1}_${kind}`;
}

export const ALL_RARES: string[] = ZONES.flatMap((_, z) =>
  Array.from({ length: RARE_PER_ZONE }, (__, k) => rareId(z, k)),
);

export function rareColor(id: string): string {
  const m = /^z(\d)_(\d)$/.exec(id);
  if (!m) return '#ffffff';
  return COLLECTION.colors[Number(m[1]) - 1]?.[Number(m[2])] ?? '#ffffff';
}

/**
 * Bir boşaltmada nadir böcek bulundu mu? `r1` olasılık, `r2` tür seçimi için [0,1) rastgele.
 * Yalnızca yarıdan fazla dolu kavanozlarda.
 */
export function rollRare(zoneIndex: number, count: number, capacity: number, r1: number, r2: number, chanceMult = 1): string | null {
  if (!countsAsFilled(count, capacity)) return null;
  if (r1 >= COLLECTION.chancePerJar * chanceMult) return null;
  const w = COLLECTION.weights;
  const total = w.reduce((a, b) => a + b, 0);
  let x = r2 * total;
  for (let k = 0; k < w.length; k++) {
    x -= w[k]!;
    if (x < 0) return rareId(zoneIndex, k);
  }
  return rareId(zoneIndex, w.length - 1);
}

export function zoneSetComplete(found: Record<string, number>, zoneIndex: number): boolean {
  for (let k = 0; k < RARE_PER_ZONE; k++) if (!found[rareId(zoneIndex, k)]) return false;
  return true;
}

/** Koleksiyonun Işık çarpanı (bulunduğun bölgenin seti + tüm set). */
export function collectionMultiplier(found: Record<string, number> | undefined, zoneIndex: number): number {
  if (!found) return 1;
  let m = 1;
  if (zoneSetComplete(found, zoneIndex)) m *= COLLECTION.zoneSetMult;
  if (ALL_RARES.every((id) => found[id])) m *= COLLECTION.allSetMult;
  return m;
}

export function foundCount(found: Record<string, number>): number {
  return ALL_RARES.filter((id) => found[id]).length;
}

// ---------------------------------------------------------------------------
// Günlük görevler

/** Cihazın yerel tarihi. */
export function localDay(now: number): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Günün görevleri: tarihten türetilir, aynı türden iki görev çıkmaz. */
export function questsForDay(day: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619) >>> 0;
  const picked: number[] = [];
  const kinds = new Set<QuestKind>();
  const n = QUESTS.templates.length;
  for (let step = 0; picked.length < QUESTS.perDay && step < n * 4; step++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const idx = h % n;
    const kind = QUESTS.templates[idx]!.kind;
    if (picked.includes(idx) || kinds.has(kind)) continue;
    picked.push(idx);
    kinds.add(kind);
  }
  return picked;
}

export function newDaily(now: number, counters: MetaCounters): DailyState {
  const day = localDay(now);
  const quests = questsForDay(day);
  return { day, base: { ...counters }, quests, claimed: quests.map(() => false), chestClaimed: false };
}

/** Gün değiştiyse yeni görevler; değişmediyse aynı nesne. */
export function ensureDaily(d: DailyState | null, now: number, counters: MetaCounters): DailyState {
  if (d && d.day === localDay(now) && d.quests.length > 0) return d;
  return newDaily(now, counters);
}

export function questProgress(d: DailyState, i: number, counters: MetaCounters): { value: number; target: number; done: boolean } {
  const tpl = QUESTS.templates[d.quests[i] ?? 0]!;
  const b = d.base;
  let value = 0;
  switch (tpl.kind) {
    case 'fillJars':
      value = counters.jarsFilled - b.jarsFilled;
      break;
    case 'catchGolden':
      value = counters.goldenCaught - b.goldenCaught;
      break;
    case 'buyUpgrades':
      value = counters.upgradesBought - b.upgradesBought;
      break;
    case 'findRare':
      value = counters.raresFound - b.raresFound;
      break;
    case 'playMinutes':
      value = Math.floor((counters.playTimeSec - b.playTimeSec) / 60);
      break;
  }
  value = Math.max(0, Math.min(tpl.target, value));
  return { value, target: tpl.target, done: value >= tpl.target };
}

/** Alınmayı bekleyen ödül sayısı (bildirim rozeti). */
export function claimableCount(d: DailyState, counters: MetaCounters): number {
  let n = 0;
  d.quests.forEach((_, i) => {
    if (!d.claimed[i] && questProgress(d, i, counters).done) n++;
  });
  if (!d.chestClaimed && d.claimed.length > 0 && d.claimed.every(Boolean)) n++;
  return n;
}

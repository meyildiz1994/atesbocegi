/**
 * Bölge mekanikleri, boss, dünya olayları, kaplar ve Yıldız yükseltmeleri için saf kurallar.
 * `'worklet'` işaretli olanlar UI thread'deki oyun döngüsünde de çalışır.
 */
import {
  BOSS,
  CONTAINERS,
  CRYSTAL,
  FEVER,
  FOG,
  MUSHROOM,
  PERK_OFFER,
  PERK_ORDER,
  PERKS,
  PRESTIGE,
  STAR_HEAD_START,
  STAR_UPGRADES,
  WIND,
  WORLD_EVENTS,
  ZONES,
  type ContainerId,
  type PerkBranch,
  type StarUpgradeId,
} from '../config/balance';

// ---------------------------------------------------------------------------
// Sisli Bataklık

/** Bölgeye girildikten `t` sn sonra sis bandı [sol, sağ] (px); sis yoksa [0, 0]. */
export function fogBand(t: number, width: number): [number, number] {
  'worklet';
  const c = t - FOG.firstDelay;
  if (c < 0) return [0, 0];
  const ph = c % FOG.period;
  if (ph > FOG.duration) return [0, 0];
  const bw = width * FOG.bandWidth;
  const left = -bw + ((width + bw) * ph) / FOG.duration;
  return [left, left + bw];
}

/** Sisin içinde halkanın yarıçap çarpanı: Fener (bahçe) seviyesiyle büyür; Fener kabı sisten etkilenmez. */
export function fogRingScale(lanternLevel: number, immune: boolean): number {
  if (immune) return 1;
  return Math.min(1, FOG.ringScale + FOG.ringScalePerLantern * Math.max(0, lanternLevel));
}

// ---------------------------------------------------------------------------
// Gök Kanyonu

/** Kaçıncı rüzgâr (bölgeye girişten `t` sn sonra); henüz yoksa -1. */
export function windGustIndex(t: number): number {
  'worklet';
  if (t < WIND.firstDelay) return -1;
  return Math.floor((t - WIND.firstDelay) / WIND.period);
}

/** Rüzgâr böceği ödülü: son Işık/sn'ye dayanır, en az birkaç dolu kavanoz. */
export function windReward(lightPerSecond: number, jarValue: number): number {
  return Math.max(lightPerSecond * WIND.rewardSeconds, jarValue * WIND.minRewardJars);
}

// ---------------------------------------------------------------------------
// Mantar Vadisi

/** Olgun mantarın nabzı: 0..1 (1'e yaklaşırken halka mantara kapanır). */
export function mushroomPulse(sinceRipeSec: number): number {
  return (Math.max(0, sinceRipeSec) / MUSHROOM.pulsePeriod) % 1;
}

/** Dokunuş tam zamanında mı (halka mantara kapandığı an)? */
export function isPerfectTap(sinceRipeSec: number): boolean {
  const p = mushroomPulse(sinceRipeSec);
  const w = MUSHROOM.perfectWindow;
  return p >= 1 - w || p <= w * 0.4;
}

/**
 * Zincir: dokunulan mantardan başlayıp `chainRange` içindeki olgun mantarlara sıçrar.
 * Patlama sırasıyla [mantar, derinlik] döner.
 */
export function chainOrder(start: number, ripe: boolean[], pos: [number, number][]): [number, number][] {
  const out: [number, number][] = [[start, 0]];
  const seen = new Set([start]);
  for (let q = 0; q < out.length; q++) {
    const [i, depth] = out[q]!;
    const near = pos
      .map((p, j) => ({ j, d: Math.hypot(p[0] - pos[i]![0], p[1] - pos[i]![1]) }))
      .filter(({ j, d }) => !seen.has(j) && ripe[j] && d <= MUSHROOM.chainRange)
      .sort((a, b) => a.d - b.d);
    for (const { j } of near) {
      seen.add(j);
      out.push([j, depth + 1]);
    }
  }
  return out;
}

/** Zincir ödülü (Işık): her halka için dolu kavanoz değeri × zincir uzunluğu. */
export function chainReward(links: number, jarValue: number): number {
  return MUSHROOM.rewardJarsPerLink * links * links * jarValue;
}

// ---------------------------------------------------------------------------
// Kristal Mağara

/** Kıt renk `scarce` olan doğma ağırlıkları. */
export function crystalWeights(scarce: number): [number, number, number] {
  return [0, 1, 2].map((k) => (k === scarce ? CRYSTAL.scarceWeight : 1)) as [number, number, number];
}

/** Bir kristalin dolması için gereken böcek. */
export function crystalGoal(jarCapacity: number): number {
  return Math.max(CRYSTAL.minCharge, Math.round(jarCapacity * CRYSTAL.chargePerCrystalJars));
}

// ---------------------------------------------------------------------------
// Boss

/** Mevcut sınır bölgesinin sonraki eşiği (son bölgede: son eşiğin 4 katı). */
export function nextThreshold(zoneIndex: number): number {
  const next = ZONES[zoneIndex + 1];
  if (next) return next.unlockAt;
  return Math.max(PRESTIGE.unlockAt, (ZONES[ZONES.length - 1]?.unlockAt ?? 0) * 4);
}

/** Boss bu bölgede ortaya çıkmalı mı? */
export function bossDue(zoneIndex: number, runLight: number, done: readonly number[]): boolean {
  if (done.includes(zoneIndex)) return false;
  return runLight >= nextThreshold(zoneIndex) * BOSS.appearAt;
}

/** 60 sn'de beslenmesi gereken böcek: son yakalama hızına göre. */
export function bossGoal(catchesPerSec: number): number {
  return Math.max(BOSS.minGoal, Math.round(catchesPerSec * BOSS.durationSec * BOSS.goalShare));
}

export function bossReward(zoneIndex: number): number {
  return nextThreshold(zoneIndex) * BOSS.rewardShare;
}

// ---------------------------------------------------------------------------
// Dünya olayları

export type WorldEventKind = 'meteor' | 'moon';

/** Sonraki olay (ms). İlki oyun süresi `firstAfterSec`'i geçince. */
export function nextWorldEventAt(nowMs: number, playTimeSec: number, rand: number): number {
  const wait = Math.max(0, WORLD_EVENTS.firstAfterSec - playTimeSec);
  const gap = WORLD_EVENTS.minGapSec + (WORLD_EVENTS.maxGapSec - WORLD_EVENTS.minGapSec) * Math.min(1, Math.max(0, rand));
  return nowMs + (wait > 0 ? wait : gap) * 1000;
}

export function pickWorldEvent(rand: number): WorldEventKind {
  return rand < 0.5 ? 'meteor' : 'moon';
}

/** Anlık olay çarpanı (dolunay, kristal rezonansı). */
export function eventLightMultiplier(nowMs: number, moonUntil: number, resonanceUntil: number): number {
  let m = 1;
  if (nowMs < moonUntil) m *= WORLD_EVENTS.moon.lightMult;
  if (nowMs < resonanceUntil) m *= CRYSTAL.resonanceMult;
  return m;
}

// ---------------------------------------------------------------------------
// Kaplar

export function containerUnlocked(id: ContainerId, bestZone: number): boolean {
  return bestZone >= CONTAINERS[id].unlockZone;
}

export function containerOf(id: string | undefined): (typeof CONTAINERS)[ContainerId] {
  return CONTAINERS[(id ?? 'jar') as ContainerId] ?? CONTAINERS.jar;
}

// ---------------------------------------------------------------------------
// Yıldız yükseltmeleri

export type StarLevels = Record<StarUpgradeId, number>;

export const emptyStarLevels = (): StarLevels => ({ starGlow: 0, starJar: 0, starNight: 0, starHead: 0 });

export function starCost(id: StarUpgradeId, level: number): number {
  const u = STAR_UPGRADES[id];
  return Math.ceil(u.base * Math.pow(u.growth, level));
}

export function starMaxed(id: StarUpgradeId, level: number): boolean {
  const u = STAR_UPGRADES[id];
  return 'maxLevel' in u && level >= u.maxLevel;
}

export type StarEffects = { value: number; jar: number; offlineCapBonus: number; headStart: number };

export function starEffects(l: Partial<StarLevels> | undefined): StarEffects {
  const s = { ...emptyStarLevels(), ...l };
  return {
    value: 1 + STAR_UPGRADES.starGlow.perLevel * s.starGlow,
    jar: 1 + STAR_UPGRADES.starJar.perLevel * s.starJar,
    offlineCapBonus: STAR_UPGRADES.starNight.perLevel * s.starNight,
    headStart: s.starHead > 0 ? STAR_HEAD_START * Math.pow(4, s.starHead - 1) : 0,
  };
}

// ---------------------------------------------------------------------------
// Seçimli yükseltmeler (perk kartları)

export type PerkLevels = Record<PerkBranch, number>;

export const emptyPerks = (): PerkLevels => Object.fromEntries(PERK_ORDER.map((b) => [b, 0])) as PerkLevels;

/** `taken` kart seçildikten sonra sıradaki teklifin geleceği dolu kavanoz sayısı (bu koşu). */
export function perkOfferAt(taken: number): number {
  let at = PERK_OFFER.first;
  for (let k = 0; k < taken; k++) at += PERK_OFFER.gapStart + PERK_OFFER.gapGrowth * k;
  return at;
}

/** İki farklı dal (dolmamış olanlardan). `r1`, `r2` 0..1. Dolmamış dal yoksa boş. */
export function perkChoices(p: Partial<PerkLevels>, r1: number, r2: number): PerkBranch[] {
  const open = PERK_ORDER.filter((b) => (p[b] ?? 0) < PERKS[b].maxTier);
  if (open.length === 0) return [];
  const a = open[Math.floor(r1 * open.length) % open.length]!;
  const rest = open.filter((b) => b !== a);
  if (rest.length === 0) return [a];
  return [a, rest[Math.floor(r2 * rest.length) % rest.length]!];
}

export type PerkEffects = {
  pull: number;
  jar: number;
  spiritSpeed: number;
  bonusSpirits: number;
  feverMult: number;
  feverThresholdMult: number;
  value: number;
  luck: number;
};

export function perkEffects(p: Partial<PerkLevels> | undefined): PerkEffects {
  const l = { ...emptyPerks(), ...p };
  return {
    pull: l.pull * PERKS.pull.perTier,
    jar: 1 + PERKS.jar.perTier * l.jar,
    spiritSpeed: 1 + PERKS.spirit.perTier * l.spirit,
    bonusSpirits: l.spirit >= PERKS.spirit.bonusSpiritAt ? 1 : 0,
    feverMult: FEVER.multiplier + PERKS.combo.perTier * l.combo,
    feverThresholdMult: l.combo >= PERKS.combo.autoFeverAt ? 0.75 : 1,
    value: 1 + PERKS.glow.perTier * l.glow,
    luck: 1 + PERKS.luck.perTier * l.luck,
  };
}

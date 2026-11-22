/**
 * Ekonomi formülleri. Saf fonksiyonlar; render ya da React'e bağımlı değil.
 */
import {
  EFFECTS,
  OFFLINE,
  PRESTIGE,
  SKILL_EFFECTS,
  SKILLS,
  SPIRIT,
  START,
  UPGRADES,
  ZONES,
  type SkillId,
  type UpgradeId,
} from '../config/balance';

export type Levels = Record<UpgradeId, number>;
export type Skills = Record<SkillId, boolean>;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Kavanoz boşaltılınca kazanılan Işık. */
export function jarPayout(count: number, valuePerFirefly: number, multiplier: number): number {
  if (count <= 0) return 0;
  return count * valuePerFirefly * multiplier;
}

/**
 * Bölgenin aydınlık seviyesi (0..1):
 * brightness = clamp(log10(bölgedeToplananIşık + 1) / hedefLog, 0, 1)
 */
export function zoneBrightness(zoneLight: number, targetLog: number): number {
  if (targetLog <= 0) return 1;
  return clamp(Math.log10(Math.max(0, zoneLight) + 1) / targetLog, 0, 1);
}

// ---------------------------------------------------------------------------
// Yükseltme maliyetleri

/** Tek seviyenin maliyeti: taban * büyüme^seviye. */
export function upgradeCost(id: UpgradeId, level: number): number {
  const u = UPGRADES[id];
  return u.baseCost * Math.pow(u.growth, level);
}

/** `level`'dan başlayarak `count` seviye almanın toplam maliyeti (geometrik toplam). */
export function bulkCost(id: UpgradeId, level: number, count: number): number {
  if (count <= 0) return 0;
  const u = UPGRADES[id];
  const first = upgradeCost(id, level);
  if (u.growth === 1) return first * count;
  return (first * (Math.pow(u.growth, count) - 1)) / (u.growth - 1);
}

/** Kalan seviye hakkı. */
export function levelsLeft(id: UpgradeId, level: number): number {
  return Math.max(0, UPGRADES[id].maxLevel - level);
}

/** Bu Işık ile en fazla kaç seviye alınabilir. */
export function maxAffordable(id: UpgradeId, level: number, light: number): number {
  const u = UPGRADES[id];
  const left = levelsLeft(id, level);
  if (left === 0) return 0;
  const first = upgradeCost(id, level);
  if (light < first) return 0;
  let n: number;
  if (u.growth === 1) {
    n = Math.floor(light / first);
  } else {
    n = Math.floor(Math.log((light * (u.growth - 1)) / first + 1) / Math.log(u.growth));
  }
  n = Math.min(n, left);
  // Kayan nokta sınırlarını düzelt.
  while (n > 0 && bulkCost(id, level, n) > light) n--;
  while (n < left && bulkCost(id, level, n + 1) <= light) n++;
  return n;
}

export type BuyMode = 1 | 10 | 'max';

/** Seçilen moda göre alınacak seviye sayısı ve maliyeti. ×10 alınamıyorsa count 0. */
export function purchasePlan(
  id: UpgradeId,
  level: number,
  light: number,
  mode: BuyMode,
): { count: number; cost: number; affordable: boolean } {
  if (mode === 'max') {
    const n = maxAffordable(id, level, light);
    const shown = Math.max(1, n);
    const count = Math.min(shown, levelsLeft(id, level));
    const cost = bulkCost(id, level, count);
    return { count, cost, affordable: n > 0 };
  }
  const count = Math.min(mode, levelsLeft(id, level));
  const cost = bulkCost(id, level, count);
  return { count, cost, affordable: count > 0 && cost <= light };
}

// ---------------------------------------------------------------------------
// Statlar

export type Stats = {
  ringRadius: number;
  jarCapacity: number;
  /** Böcek başına Işık (bölge ve global çarpan dahil). */
  valuePerFirefly: number;
  maxFireflies: number;
  spawnRate: number;
  spirits: number;
  spiritSpeed: number;
  autoEmpty: boolean;
  magnetLevel: number;
  magnetRange: number;
  magnetPull: number;
  globalMultiplier: number;
  offlineRate: number;
  offlineCapSeconds: number;
};

export type StatInput = {
  levels: Levels;
  skills: Skills;
  stardustEarned: number;
  zoneIndex: number;
  /** Satın alımlardan gelen kalıcı Işık çarpanı (Başlangıç Paketi). */
  purchaseMultiplier?: number;
};

function flatThenPct(base: number, level: number, flatLevels: number, step: number, pct: number): number {
  const flat = Math.min(level, flatLevels);
  const rest = Math.max(0, level - flatLevels);
  return (base + flat * step) * Math.pow(pct, rest);
}

export function globalMultiplier(stardustEarned: number): number {
  return 1 + PRESTIGE.multPerStardust * Math.max(0, stardustEarned);
}

export function computeStats(input: StatInput): Stats {
  const { levels: l, skills: sk } = input;
  const zone = ZONES[input.zoneIndex] ?? ZONES[0];

  let ring = START.ringRadius * Math.pow(EFFECTS.ringPerLevel, l.ring);
  if (sk.dawnRing) ring *= SKILL_EFFECTS.dawnRingMult;
  ring = Math.min(ring, EFFECTS.ringMax);

  let jar = flatThenPct(START.jarCapacity, l.jar, EFFECTS.jarFlatLevels, EFFECTS.jarFlatStep, EFFECTS.jarPctAfter);
  if (sk.deepJar) jar *= SKILL_EFFECTS.deepJarMult;

  let value = flatThenPct(
    START.valuePerFirefly,
    l.bright,
    EFFECTS.brightFlatLevels,
    EFFECTS.brightFlatStep,
    EFFECTS.brightPctAfter,
  );
  if (sk.starlight) value *= SKILL_EFFECTS.starlightMult;
  const gm = globalMultiplier(input.stardustEarned);

  const spirits = l.spirit + (sk.kindredSpirit ? 1 : 0);

  return {
    ringRadius: ring,
    jarCapacity: Math.floor(jar),
    valuePerFirefly: value * zone.multiplier * gm * (input.purchaseMultiplier ?? 1),
    maxFireflies: START.maxFireflies + EFFECTS.crowdFireflies * l.crowd,
    spawnRate: START.spawnRate * Math.pow(EFFECTS.crowdSpawnMult, l.crowd),
    spirits,
    spiritSpeed: SPIRIT.speed * (sk.kindredSpirit ? SKILL_EFFECTS.kindredSpiritSpeed : 1),
    autoEmpty: l.autoEmpty > 0,
    magnetLevel: l.magnet,
    magnetRange: l.magnet > 0 ? ring * (EFFECTS.magnetRangeBase + EFFECTS.magnetRangePerLevel * l.magnet) : 0,
    magnetPull: EFFECTS.magnetPullSpeed + EFFECTS.magnetPullPerLevel * l.magnet,
    globalMultiplier: gm,
    offlineRate: sk.dreamers ? OFFLINE.rateDreamers : OFFLINE.rate,
    offlineCapSeconds: sk.longNight ? OFFLINE.capSecondsLongNight : OFFLINE.capSeconds,
  };
}

// ---------------------------------------------------------------------------
// Bölgeler

/** Bu koşudaki Işık ile açılmış bölge sayısı (en az 1). */
export function unlockedZoneCount(runLight: number): number {
  let n = 0;
  for (const z of ZONES) if (runLight >= z.unlockAt) n++;
  return Math.max(1, n);
}

// ---------------------------------------------------------------------------
// Prestij

export function canPrestige(runLight: number): boolean {
  return runLight >= PRESTIGE.unlockAt;
}

/** Şafak'ta kazanılacak Yıldız Tozu: floor(sqrt(koşuIşığı / 1e6)). */
export function stardustForPrestige(runLight: number): number {
  if (!canPrestige(runLight)) return 0;
  return Math.floor(Math.sqrt(runLight / PRESTIGE.divisor));
}

export function canBuySkill(id: SkillId, skills: Skills, stardust: number): boolean {
  const def = SKILLS[id];
  if (skills[id]) return false;
  if (def.requires && !skills[def.requires as SkillId]) return false;
  return stardust >= def.cost;
}

// ---------------------------------------------------------------------------
// Offline kazanç

/** Ruhların saniyedeki Işık üretimi (çevrimiçi tahmin). */
export function spiritLightPerSecond(stats: Stats): number {
  const speedFactor = stats.spiritSpeed / SPIRIT.speed;
  return stats.spirits * SPIRIT.catchesPerSecond * speedFactor * stats.valuePerFirefly;
}

/**
 * Offline süre (sn). Saat geri alınırsa 0, ileri alınırsa üst sınır uygulanır.
 */
export function offlineSeconds(lastSeenMs: number, nowMs: number, capSeconds: number): number {
  if (!Number.isFinite(lastSeenMs) || lastSeenMs <= 0) return 0;
  const s = (nowMs - lastSeenMs) / 1000;
  if (!(s > 0)) return 0;
  return Math.min(s, capSeconds);
}

/** Yokken biriken Işık. */
export function offlineEarnings(stats: Stats, seconds: number): number {
  if (seconds <= 0) return 0;
  return spiritLightPerSecond(stats) * stats.offlineRate * seconds;
}

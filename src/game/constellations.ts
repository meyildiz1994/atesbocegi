/** Takımyıldız haritası kuralları. Saf. */
import { CONSTELLATION_BONUS, CONSTELLATION_ORDER, CONSTELLATIONS, type ConstellationId } from '../config/balance';

export type SkyLevels = Record<ConstellationId, number>;

export const emptySky = (): SkyLevels => Object.fromEntries(CONSTELLATION_ORDER.map((id) => [id, 0])) as SkyLevels;

export const starCount = (id: ConstellationId): number => CONSTELLATIONS[id].stars.length;

export function skyComplete(id: ConstellationId, lit: number): boolean {
  return lit >= starCount(id);
}

/** Sonraki yıldızın Yıldız Tozu maliyeti. */
export function skyCost(id: ConstellationId, lit: number): number {
  const c = CONSTELLATIONS[id];
  return Math.ceil(c.baseCost * Math.pow(c.growth, lit));
}

export type SkyEffects = {
  value: number;
  jar: number;
  mushroomReward: number;
  windReward: number;
  bossReward: number;
  crystalReward: number;
  feverBonus: number;
  offlineCapBonus: number;
  autoMushroom: boolean;
  windEverywhere: boolean;
  bossExtraSec: number;
  resonanceMult: number;
};

export function skyEffects(sky: Partial<SkyLevels> | undefined): SkyEffects {
  const l = (id: ConstellationId) => Math.min(starCount(id), sky?.[id] ?? 0);
  const done = (id: ConstellationId) => skyComplete(id, l(id));
  const per = (id: ConstellationId) => 1 + CONSTELLATIONS[id].perStar * l(id);
  return {
    value: per('hunter'),
    jar: per('bearer'),
    mushroomReward: per('gardener'),
    windReward: per('shepherd'),
    bossReward: per('warden'),
    crystalReward: per('heart'),
    feverBonus: done('hunter') ? CONSTELLATION_BONUS.feverMult : 0,
    offlineCapBonus: done('bearer') ? CONSTELLATION_BONUS.offlineHours * 3600 : 0,
    autoMushroom: done('gardener'),
    windEverywhere: done('shepherd'),
    bossExtraSec: done('warden') ? CONSTELLATION_BONUS.bossExtraSec : 0,
    resonanceMult: done('heart') ? CONSTELLATION_BONUS.resonanceMult : 1,
  };
}

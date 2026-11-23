/** Ay Döngüleri kuralları. Saf. */
import { MOON_CYCLES } from '../config/balance';
import { stardustForPrestige } from './economy';

export type MoonRules = {
  id: string;
  /** Tutulma katmanı (Tutulma'dan önce 0). */
  layer: number;
  tint: string;
  speed: number;
  spawn: number;
  /** Sis ve rüzgâr zaman ölçeği (büyük = daha sık). */
  events: number;
  /** Mantarın olgun kalma süresi çarpanı. */
  ripe: number;
  /** Kristal ve boss hedef çarpanı. */
  goal: number;
  dust: number;
  tokens: number;
};

const LAST = MOON_CYCLES.cycles.length - 1;

export function moonRules(cycle: number): MoonRules {
  const c = Math.max(0, Math.floor(cycle));
  const base = MOON_CYCLES.cycles[Math.min(c, LAST)]!;
  const layer = Math.max(0, c - LAST);
  const e = MOON_CYCLES.eclipsePerLayer;
  return {
    id: base.id,
    layer: c >= LAST ? layer + 1 : 0,
    tint: base.tint,
    speed: base.speed + e.speed * layer,
    spawn: base.spawn,
    events: base.events,
    ripe: base.ripe,
    goal: base.goal + e.goal * layer,
    dust: base.dust + e.dust * layer,
    tokens: base.tokens + e.tokens * layer,
  };
}

/** Bu koşu ayı tamamladı mı (Şafak'ta bir sonraki aya geçilir)? */
export function moonComplete(runLight: number): boolean {
  return runLight >= MOON_CYCLES.completeAt;
}

/** Şafak'ta kazanılan Yıldız Tozu, bulunulan ayın çarpanıyla. */
export function dawnStardust(runLight: number, cycle: number): number {
  return Math.floor(stardustForPrestige(runLight) * moonRules(cycle).dust);
}

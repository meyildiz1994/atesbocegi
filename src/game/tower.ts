/** Gece Kulesi kuralları. Saf. */
import { TOWER } from '../config/balance';

export type TowerRule = 'calm' | 'fast' | 'sparse' | 'wind';
const RULES: TowerRule[] = ['calm', 'fast', 'sparse', 'wind'];

export function towerRule(floor: number): TowerRule {
  return RULES[floor % RULES.length]!;
}

/** Kat hedefi: oyuncunun yakalama hızına göre, kat yükseldikçe büyür. */
export function towerGoal(floor: number, catchesPerSec: number): number {
  const base = Math.max(TOWER.minGoal, catchesPerSec * TOWER.durationSec * TOWER.goalShare);
  return Math.round(base * (1 + TOWER.growthPerFloor * (floor - 1)));
}

export type TowerReward = { tokens: number; stardust: number; chest: boolean };

export function towerReward(floor: number): TowerReward {
  const chest = floor % TOWER.chestEvery === 0;
  return {
    tokens: TOWER.tokensPerFloor + Math.floor(floor / 5) + (chest ? TOWER.chestTokens : 0),
    stardust: chest ? TOWER.chestStardust : 0,
    chest,
  };
}

/** Bugün kalan deneme hakkı. */
export function towerTriesLeft(day: string, usedDay: string, used: number, bought: number): number {
  return Math.max(0, TOWER.dailyTries + bought - (usedDay === day ? used : 0));
}

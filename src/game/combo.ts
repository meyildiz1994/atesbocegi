/** Combo: hızlı arka arkaya toplamalar (saf). Yalnızca his içindir, kazancı etkilemez. */
import { COMBO } from '../config/balance';

export type ComboState = { count: number; lastAt: number };

export const newCombo = (): ComboState => ({ count: 0, lastAt: -Infinity });

/** `n` böcek `now` (ms) anında yakalandı. */
export function addCatch(c: ComboState, n: number, now: number): ComboState {
  const alive = now - c.lastAt <= COMBO.windowMs;
  return { count: (alive ? c.count : 0) + n, lastAt: now };
}

/** Combo süresi dolduysa 0, değilse sayaç. */
export function comboCount(c: ComboState, now: number): number {
  return now - c.lastAt <= COMBO.windowMs ? c.count : 0;
}

/** Toplama sesinin perdesi: her combo adımında yarım ton, üst sınırlı. */
export function comboPitch(count: number): number {
  const steps = Math.min(Math.max(count - 1, 0), COMBO.maxPitchSteps);
  return Math.pow(2, (steps * COMBO.semitonesPerStep) / 12);
}

/** Combo durumunun tek kaynağı (JS thread). UI abone olur, ses perdesi buradan okunur. */
import { addCatch, comboCount, newCombo, type ComboState } from './combo';

let state: ComboState = newCombo();
const listeners = new Set<(count: number) => void>();

export function registerCatch(n: number, now = Date.now()): number {
  state = addCatch(state, n, now);
  for (const l of listeners) l(state.count);
  return state.count;
}

export function currentCombo(now = Date.now()): number {
  return comboCount(state, now);
}

export function subscribeCombo(fn: (count: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Combo Fever bir sonraki kez ne zaman tetiklenebilir (ms); bekleme süresi göstergesi için. */
let feverReadyAt = 0;
export function setFeverReadyAt(ms: number): void {
  feverReadyAt = ms;
}
export function feverReady(now = Date.now()): boolean {
  return now >= feverReadyAt;
}

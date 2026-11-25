/**
 * Oyun döngüsü (UI thread) ile bölge mekaniklerinin arayüzü (JS thread) arasındaki köprü.
 * - Arayüz → döngü: patlama kuyruğu ve canlı ayarlar (paylaşılan değerler).
 * - Döngü → arayüz: yakalama olayları (dinleyiciler).
 */
import { makeMutable } from 'react-native-reanimated';

import { MAX_PULSES } from './simulation';

/** Bekleyen patlamalar: [x, y, r, x, y, r, ...]. Döngü her karede boşaltır. */
export const pulseQueue = makeMutable<number[]>([]);

/** Canlı ayarlar: dünya olayı doğma çarpanı, kristal bölgesinin kıt rengi, kombo toplanması ve Gece Kulesi kuralları. */
export const zoneLive = makeMutable({
  spawnMult: 1,
  scarce: 0,
  gatherOn: false,
  gatherX: 0,
  gatherY: 0,
  /** Gece Kulesi katı sürerken: hız ve doğma çarpanı, rüzgâr. */
  towerOn: false,
  towerSpeed: 1,
  towerSpawn: 1,
  towerWind: false,
});

/** Parmak ekranda mı (UI thread yazar, JS okur): reklam oyuncu dokunurken araya girmesin. */
export const touchLive = makeMutable(false);

/** Ekranda süren olaylar (boss, kule vb.): sayaç sıfırdan büyükse zamanlı reklam beklemeye alınır. */
let busyCount = 0;
export function setEventBusy(on: boolean): void {
  busyCount = Math.max(0, busyCount + (on ? 1 : -1));
}
export function eventBusy(): boolean {
  return busyCount > 0 || zoneLive.value.towerOn || zoneLive.value.gatherOn;
}

export function queuePulse(x: number, y: number, r: number): void {
  pulseQueue.modify((q) => {
    'worklet';
    if (q.length < MAX_PULSES * 3 * 4) q.push(x, y, r);
    return q;
  }, true);
}

type PopListener = (n: number) => void;
const popListeners = new Set<PopListener>();

export function emitPop(n: number): void {
  for (const l of popListeners) l(n);
}

export function onPop(fn: PopListener): () => void {
  popListeners.add(fn);
  return () => popListeners.delete(fn);
}

type CatchListener = (total: number, kinds: number[]) => void;
type GustListener = (index: number) => void;

const catchListeners = new Set<CatchListener>();
const gustListeners = new Set<GustListener>();

/** Son yakalamalar [zaman ms, sayı]: boss hedefi için yakalama hızı. */
let recent: [number, number][] = [];
const RATE_WINDOW_MS = 30_000;

export function emitCatch(total: number, kinds: number[]): void {
  const now = Date.now();
  recent.push([now, total]);
  recent = recent.filter(([t]) => t >= now - RATE_WINDOW_MS);
  for (const l of catchListeners) l(total, kinds);
}

export function emitGust(index: number): void {
  for (const l of gustListeners) l(index);
}

/** Son 30 sn'deki yakalama hızı (böcek/sn). */
export function catchRate(now = Date.now()): number {
  let sum = 0;
  for (const [t, n] of recent) if (t >= now - RATE_WINDOW_MS) sum += n;
  return sum / (RATE_WINDOW_MS / 1000);
}

export function onCatch(fn: CatchListener): () => void {
  catchListeners.add(fn);
  return () => catchListeners.delete(fn);
}

export function onGust(fn: GustListener): () => void {
  gustListeners.add(fn);
  return () => gustListeners.delete(fn);
}

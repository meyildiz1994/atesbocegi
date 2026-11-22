/**
 * Analitik: olaylar cihazda kuyruğa alınır ve PostHog'a toplu gönderilir (anahtar varsa).
 * Anahtar yoksa ya da çevrimdışıysa olaylar kaybolmaz, cihazda bekler (en fazla ANALYTICS.maxQueued).
 * Test build'lerinde son olaylar oyun içi "Olaylar" görünümünde listelenir.
 */
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import appJson from '../../app.json';
import { APP_CONFIG } from '../config/app';
import { ANALYTICS } from '../config/balance';
import {
  buildBatch,
  enqueue,
  randomId,
  shouldFlush,
  type AnalyticsParams,
  type QueuedEvent,
} from '../game/analyticsQueue';
import { getStore } from './storage';

export type { AnalyticsParams } from '../game/analyticsQueue';

const QUEUE_KEY = 'atesbocegi.analytics.queue';
const ID_KEY = 'atesbocegi.analytics.id';

/** Test görünümü için son olaylar (yeniden eskiye). */
export const useAnalyticsDebug = create<{ recent: QueuedEvent[]; sent: number; pending: number }>(() => ({
  recent: [],
  sent: 0,
  pending: 0,
}));

let queue: QueuedEvent[] | null = null;
let distinctId = '';
let flushing = false;
let timer: ReturnType<typeof setInterval> | null = null;

function load(): QueuedEvent[] {
  if (queue) return queue;
  const store = getStore();
  try {
    queue = JSON.parse(store.getString(QUEUE_KEY) ?? '[]') as QueuedEvent[];
  } catch {
    queue = [];
  }
  distinctId = store.getString(ID_KEY) ?? '';
  if (!distinctId) {
    distinctId = randomId();
    store.set(ID_KEY, distinctId);
  }
  if (!timer) {
    timer = setInterval(() => void flush(), ANALYTICS.flushIntervalMs);
    AppState.addEventListener('change', (s) => {
      if (s !== 'active') void flush();
    });
  }
  return queue;
}

function persist(): void {
  getStore().set(QUEUE_KEY, JSON.stringify(queue ?? []));
  useAnalyticsDebug.setState({ pending: queue?.length ?? 0 });
}

const common = (): AnalyticsParams => ({
  $os: Platform.OS,
  app_version: appJson.expo.version,
});

export function track(event: string, params: AnalyticsParams = {}): void {
  const e: QueuedEvent = { event, properties: { ...common(), ...params }, timestamp: new Date().toISOString() };
  if (__DEV__) console.log(`[analytics] ${event}`, params);
  useAnalyticsDebug.setState((s) => ({ recent: [e, ...s.recent].slice(0, ANALYTICS.debugKeep) }));
  try {
    queue = enqueue(load(), e);
    persist();
    if (shouldFlush(queue.length)) void flush();
  } catch {
    // Analitik asla oyunu bozmamalı.
  }
}

/** Kuyruğu PostHog'a gönderir; başarısızsa olaylar sonraki denemeye kalır. */
export async function flush(): Promise<void> {
  const { key, host } = APP_CONFIG.posthog;
  if (!key || flushing) return;
  const q = load();
  if (q.length === 0) return;
  const batch = q.slice(0, ANALYTICS.maxQueued);
  flushing = true;
  try {
    const res = await fetch(`${host}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBatch(batch, distinctId, key)),
    });
    if (res.ok) {
      queue = (queue ?? []).slice(batch.length);
      persist();
      useAnalyticsDebug.setState((s) => ({ sent: s.sent + batch.length }));
    }
  } catch {
    // Çevrimdışı: sonra tekrar denenir.
  } finally {
    flushing = false;
  }
}

export function analyticsConnected(): boolean {
  return !!APP_CONFIG.posthog.key;
}

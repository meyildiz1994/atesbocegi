/** Analitik kuyruğu: saf yardımcılar (gönderim ve depolama servis katmanında). */
import { ANALYTICS } from '../config/balance';

export type AnalyticsParams = Record<string, string | number | boolean>;
export type QueuedEvent = { event: string; properties: AnalyticsParams; timestamp: string };

/** Kuyruğa ekler; üst sınır aşılırsa en eski olaylar düşer. */
export function enqueue(queue: QueuedEvent[], e: QueuedEvent): QueuedEvent[] {
  const next = [...queue, e];
  return next.length > ANALYTICS.maxQueued ? next.slice(next.length - ANALYTICS.maxQueued) : next;
}

export function shouldFlush(queueLength: number): boolean {
  return queueLength >= ANALYTICS.batchSize;
}

/** PostHog `/batch/` gövdesi. */
export function buildBatch(events: QueuedEvent[], distinctId: string, apiKey: string) {
  return {
    api_key: apiKey,
    batch: events.map((e) => ({
      event: e.event,
      timestamp: e.timestamp,
      properties: { ...e.properties, distinct_id: distinctId, $lib: 'atesbocegi' },
    })),
  };
}

/** Rastgele, kişisel bilgi içermeyen cihaz kimliği. */
export function randomId(rand: () => number = Math.random): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}`;
}

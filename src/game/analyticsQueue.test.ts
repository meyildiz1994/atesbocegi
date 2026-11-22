import { ANALYTICS } from '../config/balance';
import { buildBatch, enqueue, randomId, shouldFlush, type QueuedEvent } from './analyticsQueue';

const ev = (i: number): QueuedEvent => ({ event: `e${i}`, properties: { i }, timestamp: '2026-11-22T00:00:00Z' });

it('kuyruk üst sınırda en eskileri düşürür', () => {
  let q: QueuedEvent[] = [];
  for (let i = 0; i < ANALYTICS.maxQueued + 5; i++) q = enqueue(q, ev(i));
  expect(q).toHaveLength(ANALYTICS.maxQueued);
  expect(q[0]!.event).toBe('e5');
});

it('parti boyutunda gönderir', () => {
  expect(shouldFlush(ANALYTICS.batchSize - 1)).toBe(false);
  expect(shouldFlush(ANALYTICS.batchSize)).toBe(true);
});

it('PostHog parti gövdesi', () => {
  const b = buildBatch([ev(1)], 'dev-1', 'phc_x');
  expect(b.api_key).toBe('phc_x');
  expect(b.batch[0]).toEqual({
    event: 'e1',
    timestamp: '2026-11-22T00:00:00Z',
    properties: { i: 1, distinct_id: 'dev-1', $lib: 'atesbocegi' },
  });
});

it('cihaz kimliği UUID biçiminde', () => {
  expect(randomId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

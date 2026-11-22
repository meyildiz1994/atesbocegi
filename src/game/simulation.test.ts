import { SIM } from '../config/balance';
import {
  STATUS_DEAD,
  STATUS_FLYING,
  STATUS_FREE,
  countByStatus,
  createSimState,
  flightPoint,
  seedFireflies,
  stepSimulation,
  type SimParams,
} from './simulation';

const W = 400;
const H = 800;

const params = (over: Partial<SimParams> = {}): SimParams => ({
  width: W,
  height: H,
  maxFireflies: 30,
  spawnRate: 1.5,
  ringRadius: 40,
  jarCapacity: 10,
  jarCount: 0,
  jarX: W / 2,
  jarY: H - 70,
  fingerActive: false,
  fingerX: 0,
  fingerY: 0,
  spirits: 0,
  spiritSpeed: 70,
  magnetRange: 0,
  magnetPull: 90,
  ...over,
});

function run(s: ReturnType<typeof createSimState>, seconds: number, p: SimParams) {
  let arrived = 0;
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) arrived += stepSimulation(s, dt, p).arrived;
  return arrived;
}

describe('simulation', () => {
  it('spawnRate ile maxFireflies sayısına kadar doğar, fazlası olmaz', () => {
    const s = createSimState(100);
    run(s, 2, params());
    const after2s = countByStatus(s, STATUS_FREE);
    expect(after2s).toBeGreaterThanOrEqual(2);
    expect(after2s).toBeLessThanOrEqual(4);
    run(s, 60, params());
    expect(countByStatus(s, STATUS_FREE)).toBe(30);
  });

  it('böcekler oyun alanında kalır', () => {
    const s = createSimState(100);
    seedFireflies(s, 30, W, H);
    run(s, 120, params());
    for (let i = 0; i < s.capacity; i++) {
      if (s.status[i] !== STATUS_FREE) continue;
      expect(s.x[i]).toBeGreaterThan(-60);
      expect(s.x[i]).toBeLessThan(W + 60);
      expect(s.y[i]).toBeGreaterThan(-60);
      expect(s.y[i]).toBeLessThan(H * SIM.playAreaBottom + 60);
    }
  });

  it('halkanın içindeki böcek yakalanır ve kavanoza ulaşır', () => {
    const s = createSimState(10);
    seedFireflies(s, 1, W, H);
    const i = s.status.indexOf(STATUS_FREE);
    const p = params({ fingerActive: true, fingerX: s.x[i]!, fingerY: s.y[i]!, maxFireflies: 0 });
    const r = stepSimulation(s, 1 / 60, p);
    expect(r.caught).toBe(1);
    expect(s.status[i]).toBe(STATUS_FLYING);
    const arrived = run(s, SIM.flightTime + 0.2, { ...p, fingerActive: false });
    expect(arrived).toBe(1);
    expect(s.status[i]).toBe(STATUS_DEAD);
  });

  it('kavanoz doluyken toplama durur', () => {
    const s = createSimState(10);
    seedFireflies(s, 1, W, H);
    const i = s.status.indexOf(STATUS_FREE);
    const p = params({
      fingerActive: true,
      fingerX: s.x[i]!,
      fingerY: s.y[i]!,
      jarCount: 10,
      maxFireflies: 0,
    });
    expect(stepSimulation(s, 1 / 60, p).caught).toBe(0);
  });

  it('uçuştakiler kavanozda yer ayırır, taşma olmaz', () => {
    const s = createSimState(50);
    // 20 böceği aynı noktaya koy.
    seedFireflies(s, 20, W, H);
    for (let i = 0; i < 20; i++) {
      s.x[i] = 100;
      s.y[i] = 100;
      s.speed[i] = 0;
    }
    const p = params({ fingerActive: true, fingerX: 100, fingerY: 100, jarCount: 7, maxFireflies: 0 });
    expect(stepSimulation(s, 1 / 60, p).caught).toBe(3);
  });

  it('uçuş rotası başlangıç ve kavanozda biter', () => {
    expect(flightPoint(10, 20, 200, 700, 0)).toEqual({ x: 10, y: 20 });
    expect(flightPoint(10, 20, 200, 700, 1)).toEqual({ x: 200, y: 700 });
  });

  it('aynı tohumla deterministik', () => {
    const a = createSimState(50, 7);
    const b = createSimState(50, 7);
    run(a, 5, params());
    run(b, 5, params());
    expect(a.x).toEqual(b.x);
  });

  it('Işık Ruhları kendi kendine böcek toplar', () => {
    const s = createSimState(200, 3);
    seedFireflies(s, 30, W, H);
    const arrived = run(s, 30, params({ spirits: 3, jarCapacity: 1e9 }));
    expect(arrived).toBeGreaterThan(5);
    expect(s.spiritCount).toBe(3);
  });

  it('mıknatıs böcekleri halkaya çeker', () => {
    const s = createSimState(10);
    seedFireflies(s, 1, W, H);
    const i = s.status.indexOf(STATUS_FREE);
    s.x[i] = 200;
    s.y[i] = 200;
    s.speed[i] = 0;
    const p = params({ fingerActive: true, fingerX: 200, fingerY: 260, ringRadius: 40, magnetRange: 100, maxFireflies: 0 });
    stepSimulation(s, 1 / 60, p);
    expect(s.y[i]).toBeGreaterThan(200);
  });
});

/**
 * Ateşböceği simülasyonu. Saf fonksiyonlar; Reanimated worklet'i olarak UI thread'de
 * her karede çalışır, Jest'te de doğrudan test edilir. React state'e dokunmaz.
 */
import { FX, SIM, SPIRIT } from '../config/balance';

export const STATUS_DEAD = 0;
export const STATUS_FREE = 1;
export const STATUS_FLYING = 2;

export type SimState = {
  capacity: number;
  /** Simülasyon zamanı (sn). */
  time: number;
  /** Deterministik rastgelelik için LCG tohumu. */
  seed: number;
  spawnAcc: number;
  /** Uçuştaki böceklerin indeksleri (iz çizimi için, en fazla FX.trailSlots). */
  flyIdx: number[];
  flyCount: number;
  /** Son adımdaki kavanoz konumu (iz çizimi için). */
  jarX: number;
  jarY: number;
  /** Son adımın sonucu (worklet'ler arası kolay okuma için). */
  lastArrived: number;
  lastCaught: number;
  status: number[];
  x: number[];
  y: number[];
  heading: number[];
  speed: number[];
  /** Yanıp sönme ve gezinme için kişisel faz/frekanslar. */
  phase: number[];
  period: number[];
  wobbleA: number[];
  wobbleB: number[];
  /** Doğduğu an (sn). */
  born: number[];
  /** Uçuş: başlangıç noktası ve ilerleme (0..1). */
  sx: number[];
  sy: number[];
  t: number[];
  /** Işık Ruhları (sabit boyutlu, SPIRIT.maxOnScreen). */
  spiritCount: number;
  spX: number[];
  spY: number[];
  spH: number[];
  /** Ruhun peşinden gittiği böcek (-1: yok) ve hedef yenileme sayacı. */
  spTarget: number[];
  spRetarget: number[];
};

export type SimParams = {
  width: number;
  height: number;
  maxFireflies: number;
  spawnRate: number;
  ringRadius: number;
  jarCapacity: number;
  /** Kavanozdaki mevcut böcek sayısı. */
  jarCount: number;
  jarX: number;
  jarY: number;
  /** Parmak ekrandaysa toplama halkasının merkezi. */
  fingerActive: boolean;
  fingerX: number;
  fingerY: number;
  /** Işık Ruhu sayısı (çizilen en fazla SPIRIT.maxOnScreen; fazlası yarıçapa yansır). */
  spirits: number;
  spiritSpeed: number;
  /** Mıknatıs: halkanın etrafındaki böcekleri çekme alanı (0 = kapalı) ve hızı. */
  magnetRange: number;
  magnetPull: number;
};

export type StepResult = {
  /** Bu adımda kavanoza ulaşan böcek sayısı. */
  arrived: number;
  /** Bu adımda halkaya yakalanan (uçuşa başlayan) böcek sayısı. */
  caught: number;
};

export function createSimState(capacity: number = SIM.capacity, seed = 12345): SimState {
  const arr = () => new Array<number>(capacity).fill(0);
  return {
    capacity,
    time: 0,
    seed,
    spawnAcc: 0,
    flyIdx: new Array<number>(FX.trailSlots).fill(0),
    flyCount: 0,
    jarX: 0,
    jarY: 0,
    lastArrived: 0,
    lastCaught: 0,
    status: arr(),
    x: arr(),
    y: arr(),
    heading: arr(),
    speed: arr(),
    phase: arr(),
    period: arr(),
    wobbleA: arr(),
    wobbleB: arr(),
    born: arr(),
    sx: arr(),
    sy: arr(),
    t: arr(),
    spiritCount: 0,
    spX: new Array<number>(SPIRIT.maxOnScreen).fill(0),
    spY: new Array<number>(SPIRIT.maxOnScreen).fill(0),
    spH: new Array<number>(SPIRIT.maxOnScreen).fill(0),
    spTarget: new Array<number>(SPIRIT.maxOnScreen).fill(-1),
    spRetarget: new Array<number>(SPIRIT.maxOnScreen).fill(0),
  };
}

/** 0..1 arası deterministik rastgele sayı (LCG). State'teki tohumu ilerletir. */
export function rand(s: SimState): number {
  'worklet';
  s.seed = (s.seed * 1664525 + 1013904223) % 4294967296;
  return s.seed / 4294967296;
}

function randRange(s: SimState, min: number, max: number): number {
  'worklet';
  return min + (max - min) * rand(s);
}

export function playAreaBottom(height: number): number {
  'worklet';
  return height * SIM.playAreaBottom;
}

export function countByStatus(s: SimState, status: number): number {
  'worklet';
  let n = 0;
  for (let i = 0; i < s.capacity; i++) if (s.status[i] === status) n++;
  return n;
}

/** Boş bir yuvaya kenardan içeri süzülen yeni bir ateşböceği koyar. -1: yer yok. */
export function spawnFirefly(s: SimState, width: number, height: number, inside = false): number {
  'worklet';
  let slot = -1;
  for (let i = 0; i < s.capacity; i++) {
    if (s.status[i] === STATUS_DEAD) {
      slot = i;
      break;
    }
  }
  if (slot < 0) return -1;

  const bottom = playAreaBottom(height);
  let x: number;
  let y: number;
  let heading: number;
  if (inside) {
    x = randRange(s, SIM.edgeMargin, width - SIM.edgeMargin);
    y = randRange(s, SIM.edgeMargin, bottom - SIM.edgeMargin);
    heading = randRange(s, 0, Math.PI * 2);
  } else {
    // Sol, sağ ya da üst kenardan, hafif içeri bakarak.
    const side = Math.floor(rand(s) * 3);
    if (side === 0) {
      x = -10;
      y = randRange(s, SIM.edgeMargin, bottom - SIM.edgeMargin);
      heading = randRange(s, -0.6, 0.6);
    } else if (side === 1) {
      x = width + 10;
      y = randRange(s, SIM.edgeMargin, bottom - SIM.edgeMargin);
      heading = Math.PI + randRange(s, -0.6, 0.6);
    } else {
      x = randRange(s, SIM.edgeMargin, width - SIM.edgeMargin);
      y = -10;
      heading = Math.PI / 2 + randRange(s, -0.6, 0.6);
    }
  }

  s.status[slot] = STATUS_FREE;
  s.x[slot] = x;
  s.y[slot] = y;
  s.heading[slot] = heading;
  s.speed[slot] = randRange(s, SIM.speedMin, SIM.speedMax);
  s.phase[slot] = randRange(s, 0, Math.PI * 2);
  s.period[slot] = randRange(s, SIM.blinkPeriodMin, SIM.blinkPeriodMax);
  s.wobbleA[slot] = randRange(s, 0, 100);
  s.wobbleB[slot] = randRange(s, 0, 100);
  s.born[slot] = s.time;
  s.t[slot] = 0;
  return slot;
}

/** 0..1: yanıp sönme ve doğuştaki yavaş açılma birlikte. */
export function fireflyBrightness(s: SimState, i: number): number {
  'worklet';
  const cycle = Math.sin((s.time / s.period[i]!) * Math.PI * 2 + s.phase[i]!);
  const blink = SIM.blinkFloor + (1 - SIM.blinkFloor) * (0.5 + 0.5 * cycle) ** 2;
  const age = s.time - s.born[i]!;
  const fade = Math.min(1, age / SIM.fadeInTime);
  return blink * fade;
}

/** İkinci dereceden bezier: kavisli uçuş rotası. */
export function flightPoint(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  t: number,
): { x: number; y: number } {
  'worklet';
  const cx = (sx + tx) / 2;
  const cy = Math.min(sy, ty) - SIM.flightArc;
  const u = 1 - t;
  return {
    x: u * u * sx + 2 * u * t * cx + t * t * tx,
    y: u * u * sy + 2 * u * t * cy + t * t * ty,
  };
}

/** Uçuşta yumuşak hızlanma/yavaşlama. */
export function easeInOut(t: number): number {
  'worklet';
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Yakalanan böceği kavanoza uçuşa geçirir. */
function startFlight(s: SimState, i: number): void {
  'worklet';
  s.status[i] = STATUS_FLYING;
  s.sx[i] = s.x[i]!;
  s.sy[i] = s.y[i]!;
  s.t[i] = 0;
}

/** Ruhları ekler/çıkarır ve hareket ettirir; yakaladıkları böcek sayısını döner. */
function stepSpirits(s: SimState, dt: number, p: SimParams, bottom: number, roomIn: number): number {
  'worklet';
  const onScreen = Math.min(p.spirits, SPIRIT.maxOnScreen);
  // Yeni ruhlar ekranın ortasından doğar.
  while (s.spiritCount < onScreen) {
    const k = s.spiritCount;
    s.spX[k] = p.width / 2 + randRange(s, -40, 40);
    s.spY[k] = bottom / 2 + randRange(s, -40, 40);
    s.spH[k] = randRange(s, 0, Math.PI * 2);
    s.spTarget[k] = -1;
    s.spRetarget[k] = 0;
    s.spiritCount++;
  }
  if (s.spiritCount > onScreen) s.spiritCount = onScreen;
  if (onScreen === 0) return 0;

  // Fazla ruhlar yakalama yarıçapını büyütür.
  const extra = p.spirits / onScreen;
  const radius = SPIRIT.radius * Math.sqrt(extra);
  const r2 = radius * radius;
  let room = roomIn;
  let caught = 0;

  for (let k = 0; k < s.spiritCount; k++) {
    s.spRetarget[k] = s.spRetarget[k]! - dt;
    let tgt = s.spTarget[k]!;
    if (tgt >= 0 && s.status[tgt] !== STATUS_FREE) tgt = -1;
    if (tgt < 0 || s.spRetarget[k]! <= 0) {
      // Rastgele birkaç böcek dene, en yakını seç.
      let best = -1;
      let bestD = 1e18;
      for (let tries = 0; tries < 6; tries++) {
        const i = Math.floor(rand(s) * s.capacity);
        if (s.status[i] !== STATUS_FREE) continue;
        const dx = s.x[i]! - s.spX[k]!;
        const dy = s.y[i]! - s.spY[k]!;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best >= 0) tgt = best;
      s.spRetarget[k] = 0.8;
    }
    s.spTarget[k] = tgt;

    let h = s.spH[k]!;
    if (tgt >= 0) {
      const want = Math.atan2(s.y[tgt]! - s.spY[k]!, s.x[tgt]! - s.spX[k]!);
      let diff = want - h;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      h += Math.max(-1, Math.min(1, diff)) * SPIRIT.turnRate * dt * 2;
    } else {
      h += Math.sin(s.time * 1.3 + k) * SPIRIT.turnRate * dt;
    }
    s.spH[k] = h;
    let x = s.spX[k]! + Math.cos(h) * p.spiritSpeed * dt;
    let y = s.spY[k]! + Math.sin(h) * p.spiritSpeed * dt;
    x = Math.max(10, Math.min(p.width - 10, x));
    y = Math.max(10, Math.min(bottom - 10, y));
    s.spX[k] = x;
    s.spY[k] = y;

    if (room <= 0) continue;
    // Yakındaki hedef ve rastgele komşular: tam tarama yerine hedefe bak.
    if (tgt >= 0 && s.status[tgt] === STATUS_FREE) {
      const dx = s.x[tgt]! - x;
      const dy = s.y[tgt]! - y;
      if (dx * dx + dy * dy <= r2) {
        startFlight(s, tgt);
        s.spTarget[k] = -1;
        room--;
        caught++;
      }
    }
  }
  return caught;
}

/** Simülasyonu dt saniye ilerletir. State'i yerinde değiştirir. */
export function stepSimulation(s: SimState, dtRaw: number, p: SimParams): StepResult {
  'worklet';
  const dt = Math.min(Math.max(dtRaw, 0), SIM.maxDt);
  s.time += dt;
  const bottom = playAreaBottom(p.height);
  const r2 = p.ringRadius * p.ringRadius;

  let free = 0;
  let flying = 0;
  for (let i = 0; i < s.capacity; i++) {
    if (s.status[i] === STATUS_FREE) free++;
    else if (s.status[i] === STATUS_FLYING) flying++;
  }

  let arrived = 0;
  let caught = 0;
  s.flyCount = 0;
  s.jarX = p.jarX;
  s.jarY = p.jarY;
  // Kavanozda yer var mı? Uçuştakiler de yer ayırmış sayılır.
  let room = p.jarCapacity - p.jarCount - flying;

  for (let i = 0; i < s.capacity; i++) {
    const st = s.status[i];
    if (st === STATUS_FREE) {
      // Organik süzülme: iki sinüsün karışımıyla yön değişimi.
      const w =
        Math.sin(s.time * 0.9 + s.wobbleA[i]!) + 0.6 * Math.sin(s.time * 2.3 + s.wobbleB[i]!);
      let h = s.heading[i]! + w * SIM.turnRate * dt;
      const x = s.x[i]!;
      const y = s.y[i]!;
      // Kenarlarda merkeze doğru yumuşakça dön.
      if (x < SIM.edgeMargin || x > p.width - SIM.edgeMargin || y < SIM.edgeMargin || y > bottom - SIM.edgeMargin) {
        const toCenter = Math.atan2(bottom / 2 - y, p.width / 2 - x);
        let diff = toCenter - h;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        h += diff * Math.min(1, 2.5 * dt);
      }
      s.heading[i] = h;
      s.x[i] = x + Math.cos(h) * s.speed[i]! * dt;
      s.y[i] = y + Math.sin(h) * s.speed[i]! * dt;

      if (p.fingerActive && room > 0) {
        const dx = s.x[i]! - p.fingerX;
        const dy = s.y[i]! - p.fingerY;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          startFlight(s, i);
          room--;
          caught++;
          free--;
          flying++;
        } else if (p.magnetRange > 0 && d2 <= p.magnetRange * p.magnetRange) {
          // Mıknatıs: halkaya doğru çek.
          const d = Math.sqrt(d2);
          s.x[i] = s.x[i]! - (dx / d) * p.magnetPull * dt;
          s.y[i] = s.y[i]! - (dy / d) * p.magnetPull * dt;
        }
      }
    } else if (st === STATUS_FLYING) {
      const t = s.t[i]! + dt / SIM.flightTime;
      if (t >= 1) {
        s.status[i] = STATUS_DEAD;
        s.t[i] = 1;
        arrived++;
        flying--;
      } else {
        s.t[i] = t;
        if (s.flyCount < FX.trailSlots) s.flyIdx[s.flyCount++] = i;
        const pt = flightPoint(s.sx[i]!, s.sy[i]!, p.jarX, p.jarY, easeInOut(t));
        s.x[i] = pt.x;
        s.y[i] = pt.y;
      }
    }
  }

  const spiritCaught = stepSpirits(s, dt, p, bottom, room);
  caught += spiritCaught;
  free -= spiritCaught;

  // Eksik böcekleri spawnRate hızında tamamla.
  if (free < p.maxFireflies) {
    s.spawnAcc += p.spawnRate * dt;
    while (s.spawnAcc >= 1 && free < p.maxFireflies) {
      s.spawnAcc -= 1;
      if (spawnFirefly(s, p.width, p.height) < 0) break;
      free++;
    }
  } else {
    s.spawnAcc = 0;
  }

  s.lastArrived = arrived;
  s.lastCaught = caught;
  return { arrived, caught };
}

/** Oyun başında ekranı doldurur (kenardan beklemeden). */
export function seedFireflies(s: SimState, count: number, width: number, height: number): void {
  'worklet';
  for (let k = 0; k < count; k++) {
    if (spawnFirefly(s, width, height, true) < 0) break;
  }
}

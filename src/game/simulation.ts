/**
 * Ateşböceği simülasyonu. Saf fonksiyonlar; Reanimated worklet'i olarak UI thread'de
 * her karede çalışır, Jest'te de doğrudan test edilir. React state'e dokunmaz.
 */
import { FX, KIND, SIM, SPIRIT, WIND } from '../config/balance';

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
  /** Uzaysal ızgara: hücre başına ilk böcek (-1 boş) ve böcek başına sonraki (bağlı liste). */
  gridHead: number[];
  gridNext: number[];
  gridCols: number;
  gridRows: number;
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
  /** Böcek türü (KIND): sıradan, kristal renkleri, rüzgâr böceği. */
  kind: number[];
  /** Sis bandı (ekran x aralığı); sağ ≤ sol ise sis yok. Çizim de buradan okur. */
  fogL: number;
  fogR: number;
  /** Bu adımda işlenecek patlamalar (mantar zinciri): merkez ve yarıçap. */
  pulseN: number;
  pulseX: number[];
  pulseY: number[];
  pulseR: number[];
  /** Son adımda türe göre yakalanan böcek sayısı. */
  caughtKind: number[];
  /** Son adımda combo patlamasıyla patlatılan böcek sayısı. */
  lastPopped: number;
  /** Ay Döngüsü: yeni doğan böceklerin hız çarpanı. */
  speedMult: number;
};

export const MAX_PULSES = 4;
const KIND_COUNT = 5;

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
  /** Sisin içinde halka yarıçapı çarpanı (1 = etkisiz). */
  fogRingScale?: number;
  /** Kristal Mağara: renkli böceklerin oranı (0 = kapalı) ve üç rengin ağırlıkları. */
  crystalShare?: number;
  crystalWeights?: [number, number, number];
  /** Combo Fever: serbest böcekler bu noktaya toplanır. */
  gatherOn?: boolean;
  gatherX?: number;
  gatherY?: number;
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
    gridHead: new Array<number>(SIM.gridMaxCells).fill(-1),
    gridNext: arr(),
    gridCols: 0,
    gridRows: 0,
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
    kind: arr(),
    fogL: 0,
    fogR: 0,
    pulseN: 0,
    pulseX: new Array<number>(MAX_PULSES).fill(0),
    pulseY: new Array<number>(MAX_PULSES).fill(0),
    pulseR: new Array<number>(MAX_PULSES).fill(0),
    caughtKind: new Array<number>(KIND_COUNT).fill(0),
    lastPopped: 0,
    speedMult: 1,
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
export function spawnFirefly(s: SimState, width: number, height: number, inside = false, kind: number = KIND.normal): number {
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
  s.speed[slot] = randRange(s, SIM.speedMin, SIM.speedMax) * s.speedMult;
  s.phase[slot] = randRange(s, 0, Math.PI * 2);
  s.period[slot] = randRange(s, SIM.blinkPeriodMin, SIM.blinkPeriodMax);
  s.wobbleA[slot] = randRange(s, 0, 100);
  s.wobbleB[slot] = randRange(s, 0, 100);
  s.born[slot] = s.time;
  s.t[slot] = 0;
  s.kind[slot] = kind;
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

/** Böcek sisin içinde mi? (Rüzgâr böcekleri sisten etkilenmez.) */
export function inFog(s: SimState, i: number): boolean {
  'worklet';
  return s.fogR > s.fogL && s.kind[i] !== KIND.wind && s.x[i]! >= s.fogL && s.x[i]! <= s.fogR;
}

/** Yakalanan böceği uçuşa geçirir ve türünü sayar. */
function catchFirefly(s: SimState, i: number): void {
  'worklet';
  startFlight(s, i);
  const k = s.kind[i]!;
  s.caughtKind[k] = (s.caughtKind[k] ?? 0) + 1;
}

/** Rüzgâr: ekranın solundan arka arkaya giren hızlı, nadir böcekler. Eklenen sayıyı döner. */
export function spawnWindGust(s: SimState, count: number, width: number, height: number): number {
  'worklet';
  const bottom = playAreaBottom(height);
  let n = 0;
  for (let k = 0; k < count; k++) {
    const slot = spawnFirefly(s, width, height, false, KIND.wind);
    if (slot < 0) break;
    s.x[slot] = -20 - k * 70;
    s.y[slot] = randRange(s, bottom * 0.18, bottom * 0.8);
    s.heading[slot] = randRange(s, -0.15, 0.15);
    s.speed[slot] = randRange(s, WIND.speedMin, WIND.speedMax);
    n++;
  }
  return n;
}

/** Kristal Mağara için doğacak böceğin türü. */
function pickKind(s: SimState, p: SimParams): number {
  'worklet';
  const share = p.crystalShare ?? 0;
  if (share <= 0 || rand(s) >= share) return KIND.normal;
  const w = p.crystalWeights ?? [1, 1, 1];
  const total = w[0] + w[1] + w[2];
  let x = rand(s) * total;
  if ((x -= w[0]) < 0) return KIND.crystalA;
  if ((x -= w[1]) < 0) return KIND.crystalB;
  return KIND.crystalC;
}

/** Serbest böcekleri ızgaraya yerleştirir (her adımda yeniden). */
function buildGrid(s: SimState, width: number, height: number): void {
  'worklet';
  const cell = SIM.gridCell;
  let cols = Math.ceil(width / cell);
  let rows = Math.ceil(height / cell);
  if (cols * rows > SIM.gridMaxCells) rows = Math.floor(SIM.gridMaxCells / cols);
  s.gridCols = cols;
  s.gridRows = rows;
  const n = cols * rows;
  for (let c = 0; c < n; c++) s.gridHead[c] = -1;
  for (let i = 0; i < s.capacity; i++) {
    if (s.status[i] !== STATUS_FREE) continue;
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(s.x[i]! / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(s.y[i]! / cell)));
    const c = cy * cols + cx;
    s.gridNext[i] = s.gridHead[c]!;
    s.gridHead[c] = i;
  }
}

/** (x, y) çevresindeki `radius` kutusuna düşen hücrelerin aralığı. */
function cellRange(s: SimState, x: number, y: number, radius: number): [number, number, number, number] {
  'worklet';
  const cell = SIM.gridCell;
  return [
    Math.max(0, Math.floor((x - radius) / cell)),
    Math.min(s.gridCols - 1, Math.floor((x + radius) / cell)),
    Math.max(0, Math.floor((y - radius) / cell)),
    Math.min(s.gridRows - 1, Math.floor((y + radius) / cell)),
  ];
}

/** En yakın serbest böcek (`radius` içinde), yoksa -1. */
function nearestFree(s: SimState, x: number, y: number, radius: number): number {
  'worklet';
  const [x0, x1, y0, y1] = cellRange(s, x, y, radius);
  let best = -1;
  let bestD = radius * radius;
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      let i = s.gridHead[cy * s.gridCols + cx]!;
      while (i >= 0) {
        if (s.status[i] === STATUS_FREE) {
          const dx = s.x[i]! - x;
          const dy = s.y[i]! - y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        i = s.gridNext[i]!;
      }
    }
  }
  return best;
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
    // Yeni hedef yalnızca zamanlayıcı dolunca (yakaladıktan sonra kısa bir dinlenme olur).
    if (s.spRetarget[k]! <= 0) {
      // Önce ızgarada yakındaki en yakın böcek; yoksa rastgele birkaç böcek dene.
      let best = nearestFree(s, s.spX[k]!, s.spY[k]!, SPIRIT.searchRadius);
      let bestD = best >= 0 ? 0 : 1e18;
      for (let tries = 0; best < 0 && tries < 6; tries++) {
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
    if (tgt >= 0 && s.status[tgt] === STATUS_FREE && s.kind[tgt] !== KIND.wind && !inFog(s, tgt)) {
      const dx = s.x[tgt]! - x;
      const dy = s.y[tgt]! - y;
      if (dx * dx + dy * dy <= r2) {
        catchFirefly(s, tgt);
        s.spTarget[k] = -1;
        s.spRetarget[k] = SPIRIT.catchCooldown;
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
  for (let k = 0; k < KIND_COUNT; k++) s.caughtKind[k] = 0;
  s.jarX = p.jarX;
  s.jarY = p.jarY;
  // Kavanozda yer var mı? Uçuştakiler de yer ayırmış sayılır.
  let room = p.jarCapacity - p.jarCount - flying;

  for (let i = 0; i < s.capacity; i++) {
    const st = s.status[i];
    if (st === STATUS_FREE && s.kind[i] === KIND.wind) {
      // Rüzgâr böceği: hafif dalgalanarak dümdüz geçer, ekrandan çıkınca kaybolur.
      const h = s.heading[i]! + Math.sin(s.time * 3 + s.wobbleA[i]!) * 0.6 * dt;
      s.heading[i] = h;
      s.x[i] = s.x[i]! + Math.cos(h) * s.speed[i]! * dt;
      s.y[i] = s.y[i]! + Math.sin(h) * s.speed[i]! * dt + Math.sin(s.time * 4 + s.wobbleB[i]!) * 30 * dt;
      if (s.x[i]! > p.width + 30) {
        s.status[i] = STATUS_DEAD;
        free--;
      }
    } else if (st === STATUS_FREE && p.gatherOn) {
      // Combo Fever: hepsi ekranın ortasına doğru hızla toplanır, orada kaynar.
      const gx = p.gatherX ?? p.width / 2;
      const gy = p.gatherY ?? bottom / 2;
      const dx = gx - s.x[i]!;
      const dy = gy - s.y[i]!;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const sp = Math.min(d * 3, SIM.gatherSpeed);
      s.x[i] = s.x[i]! + (dx / d) * sp * dt + Math.cos(s.time * 9 + s.wobbleA[i]!) * 40 * dt;
      s.y[i] = s.y[i]! + (dy / d) * sp * dt + Math.sin(s.time * 9 + s.wobbleB[i]!) * 40 * dt;
    } else if (st === STATUS_FREE) {
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

  buildGrid(s, p.width, bottom);

  // Parmak: yalnızca halkanın (ve mıknatısın) kapsadığı ızgara hücrelerine bakılır.
  if (p.fingerActive) {
    const fs = p.fogRingScale ?? 1;
    const r2f = r2 * fs * fs;
    const reach = Math.max(p.ringRadius, p.magnetRange);
    const [x0, x1, y0, y1] = cellRange(s, p.fingerX, p.fingerY, reach);
    const m2 = p.magnetRange * p.magnetRange;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        let i = s.gridHead[cy * s.gridCols + cx]!;
        while (i >= 0) {
          const nextI = s.gridNext[i]!;
          if (s.status[i] === STATUS_FREE) {
            const dx = s.x[i]! - p.fingerX;
            const dy = s.y[i]! - p.fingerY;
            const d2 = dx * dx + dy * dy;
            if (d2 <= (inFog(s, i) ? r2f : r2)) {
              if (room > 0) {
                catchFirefly(s, i);
                room--;
                caught++;
                free--;
                flying++;
              }
            } else if (p.magnetRange > 0 && d2 <= m2 && room > 0) {
              // Mıknatıs: halkaya doğru çek.
              const d = Math.sqrt(d2);
              s.x[i] = s.x[i]! - (dx / d) * p.magnetPull * dt;
              s.y[i] = s.y[i]! - (dy / d) * p.magnetPull * dt;
            }
          }
          i = nextI;
        }
      }
    }
  }

  // Patlamalar (mantar zinciri): yarıçaptaki tüm serbest böcekler kavanoza uçar.
  // Negatif yarıçap: combo patlaması; böcekler kavanoza gitmez, yerinde patlar ve sayılır.
  s.lastPopped = 0;
  for (let q = 0; q < s.pulseN; q++) {
    const px = s.pulseX[q]!;
    const py = s.pulseY[q]!;
    const pr = s.pulseR[q]!;
    if (pr < 0) {
      const rr = pr * pr;
      for (let i = 0; i < s.capacity; i++) {
        if (s.status[i] !== STATUS_FREE) continue;
        const dx = s.x[i]! - px;
        const dy = s.y[i]! - py;
        if (dx * dx + dy * dy <= rr) {
          s.status[i] = STATUS_DEAD;
          s.lastPopped++;
          free--;
        }
      }
      continue;
    }
    const pr2 = pr * pr;
    const [x0, x1, y0, y1] = cellRange(s, px, py, pr);
    for (let cy = y0; cy <= y1 && room > 0; cy++) {
      for (let cx = x0; cx <= x1 && room > 0; cx++) {
        let i = s.gridHead[cy * s.gridCols + cx]!;
        while (i >= 0 && room > 0) {
          const nextI = s.gridNext[i]!;
          if (s.status[i] === STATUS_FREE) {
            const dx = s.x[i]! - px;
            const dy = s.y[i]! - py;
            if (dx * dx + dy * dy <= pr2) {
              catchFirefly(s, i);
              room--;
              caught++;
              free--;
              flying++;
            }
          }
          i = nextI;
        }
      }
    }
  }
  s.pulseN = 0;

  const spiritCaught = stepSpirits(s, dt, p, bottom, room);
  caught += spiritCaught;
  free -= spiritCaught;

  // Eksik böcekleri spawnRate hızında tamamla.
  if (free < p.maxFireflies) {
    s.spawnAcc += p.spawnRate * dt;
    while (s.spawnAcc >= 1 && free < p.maxFireflies) {
      s.spawnAcc -= 1;
      if (spawnFirefly(s, p.width, p.height, false, pickKind(s, p)) < 0) break;
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

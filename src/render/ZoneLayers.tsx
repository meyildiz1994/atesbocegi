import { BlurMask, Group, Line, Oval, Rect, LinearGradient, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { KIND, WIND } from '../config/balance';
import { STATUS_FREE, type SimState } from '../game/simulation';

/** Sis bulutları: bandın içinde yatay dizili, yavaşça kabaran yumuşak oval'lar. */
const PUFFS = Array.from({ length: 9 }, (_, i) => ({
  u: i / 8,
  v: [0.12, 0.3, 0.5, 0.7, 0.88, 0.22, 0.6, 0.4, 0.78][i]!,
  r: [1, 0.8, 1.1, 0.9, 1, 0.7, 0.95, 0.85, 0.75][i]!,
  phase: i * 1.7,
}));

function Puff({ sim, u, v, r, phase, bottom }: { sim: SharedValue<SimState>; u: number; v: number; r: number; phase: number; bottom: number }) {
  const rect = useDerivedValue(() => {
    const s = sim.value;
    const w = s.fogR - s.fogL;
    const rw = Math.max(0, w * 0.55 * r * (1 + 0.08 * Math.sin(s.time * 0.7 + phase)));
    const rh = bottom * 0.22 * r;
    const cx = s.fogL + w * u;
    const cy = bottom * v + 14 * Math.sin(s.time * 0.5 + phase);
    return { x: cx - rw / 2, y: cy - rh / 2, width: rw, height: rh };
  });
  return (
    <Oval rect={rect} color="#b8d8d0" opacity={0.22}>
      <BlurMask blur={28} style="normal" />
    </Oval>
  );
}

/** Sisli Bataklık'ın sis dalgası (böceklerin üstünde çizilir, onları örter). */
export function FogLayer({ sim, height }: { sim: SharedValue<SimState>; height: number }) {
  const bottom = height * 0.82;
  const visible = useDerivedValue(() => (sim.value.fogR > sim.value.fogL ? 1 : 0));
  const veil = useDerivedValue(() => {
    const s = sim.value;
    return { x: s.fogL, y: 0, width: Math.max(0, s.fogR - s.fogL), height: bottom };
  });
  const veilStart = useDerivedValue(() => vec(sim.value.fogL, 0));
  const veilEnd = useDerivedValue(() => vec(sim.value.fogR, 0));
  return (
    <Group opacity={visible}>
      <Rect rect={veil}>
        <LinearGradient start={veilStart} end={veilEnd} colors={['#9cc8bc00', '#9cc8bc40', '#9cc8bc48', '#9cc8bc00']} positions={[0, 0.25, 0.75, 1]} />
      </Rect>
      {PUFFS.map((p, i) => (
        <Puff key={i} sim={sim} {...p} bottom={bottom} />
      ))}
    </Group>
  );
}

const WIND_SLOTS = 8;

function Streak({ sim, slot, ids }: { sim: SharedValue<SimState>; slot: number; ids: SharedValue<number[]> }) {
  const p1 = useDerivedValue(() => {
    const i = ids.value[slot] ?? -1;
    const s = sim.value;
    return i < 0 ? vec(-100, -100) : vec(s.x[i]! - 6, s.y[i]!);
  });
  const p2 = useDerivedValue(() => {
    const i = ids.value[slot] ?? -1;
    const s = sim.value;
    return i < 0 ? vec(-100, -100) : vec(s.x[i]! - 70, s.y[i]! - Math.sin(s.heading[i]!) * 70);
  });
  const opacity = useDerivedValue(() => ((ids.value[slot] ?? -1) < 0 ? 0 : 0.55));
  return (
    <Line p1={p1} p2={p2} color={WIND.color} strokeWidth={3} strokeCap="round" opacity={opacity}>
      <BlurMask blur={3} style="normal" />
    </Line>
  );
}

/** Gök Kanyonu: rüzgâr böceklerinin arkasındaki hız çizgileri. */
export function WindStreaks({ sim }: { sim: SharedValue<SimState> }) {
  const ids = useDerivedValue(() => {
    const s = sim.value;
    const out: number[] = [];
    for (let i = 0; i < s.capacity && out.length < WIND_SLOTS; i++) {
      if (s.status[i] === STATUS_FREE && s.kind[i] === KIND.wind) out.push(i);
    }
    return out;
  });
  return (
    <Group blendMode="plus">
      {Array.from({ length: WIND_SLOTS }, (_, k) => (
        <Streak key={k} sim={sim} slot={k} ids={ids} />
      ))}
    </Group>
  );
}

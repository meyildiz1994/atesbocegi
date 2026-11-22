import { Atlas, Circle, RadialGradient, Skia, useColorBuffer, useRSXformBuffer, useTexture, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { FX, SIM } from '../config/balance';
import { easeInOut, flightPoint, type SimState } from '../game/simulation';

const T = SIM.textureSize;
const TEXTURE_SIZE = { width: T, height: T };
const HALF = T / 2;
const SCALE = SIM.spriteSize / T;
const SEG = FX.trailSegments;
const N = FX.trailSlots * SEG;

/** Kavanoza uçan böceklerin arkasındaki kısa ışık izi (tek Atlas). */
export function Trails({ sim, tint }: { sim: SharedValue<SimState>; tint: SharedValue<[number, number, number]> }) {
  const texture = useTexture(
    <Circle cx={HALF} cy={HALF} r={HALF}>
      <RadialGradient c={vec(HALF, HALF)} r={HALF} colors={['#ffffffcc', '#ffffff33', '#ffffff00']} positions={[0, 0.3, 1]} />
    </Circle>,
    TEXTURE_SIZE,
  );
  const sprites = useMemo(() => new Array(N).fill(0).map(() => Skia.XYWHRect(0, 0, T, T)), []);

  const transforms = useRSXformBuffer(N, (val, k) => {
    'worklet';
    const s = sim.value;
    const slot = Math.floor(k / SEG);
    const seg = (k % SEG) + 1;
    if (slot >= s.flyCount) {
      val.set(0, 0, -1000, -1000);
      return;
    }
    const i = s.flyIdx[slot]!;
    const tt = s.t[i]! - seg * FX.trailSpacing;
    if (tt <= 0) {
      val.set(0, 0, -1000, -1000);
      return;
    }
    const pt = flightPoint(s.sx[i]!, s.sy[i]!, s.jarX, s.jarY, easeInOut(tt));
    const scale = SCALE * (1 - seg / (SEG + 1));
    val.set(scale, 0, pt.x - scale * HALF, pt.y - scale * HALF);
  });

  const colors = useColorBuffer(N, (val, k) => {
    'worklet';
    const c = tint.value;
    const seg = (k % SEG) + 1;
    val[0] = c[0];
    val[1] = c[1];
    val[2] = c[2];
    val[3] = FX.trailAlpha * (1 - seg / (SEG + 1));
  });

  return <Atlas image={texture} sprites={sprites} transforms={transforms} colors={colors} colorBlendMode="modulate" blendMode="plus" />;
}

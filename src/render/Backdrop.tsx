import { Group, LinearGradient, Path, Rect, Skia, vec, type SkPath } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { interpolateColor, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { COLORS } from '../config/balance';

type Props = {
  width: number;
  height: number;
  /** Bölgenin aydınlığı, 0..1. */
  brightness: SharedValue<number>;
};

const RIM_OFFSET = [{ translateY: -1.5 }];

/** Basit deterministik rastgele (her açılışta aynı orman). */
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bir sıra çam silueti: üst üste binen üçgen katmanlar. */
function pineRow(
  width: number,
  groundY: number,
  count: number,
  minH: number,
  maxH: number,
  seed: number,
): SkPath {
  const rnd = mulberry(seed);
  const path = Skia.PathBuilder.Make();
  const step = width / count;
  for (let k = -1; k <= count; k++) {
    const cx = k * step + rnd() * step;
    const h = minH + rnd() * (maxH - minH);
    const w = h * (0.32 + rnd() * 0.12);
    const tiers = 3 + Math.floor(rnd() * 2);
    for (let t = 0; t < tiers; t++) {
      const top = groundY - h + (t * h) / (tiers + 0.6);
      const bottom = top + h / tiers + h * 0.18;
      const half = (w / 2) * (0.55 + (0.45 * (t + 1)) / tiers);
      path.moveTo(cx, top);
      path.lineTo(cx + half, Math.min(bottom, groundY));
      path.lineTo(cx - half, Math.min(bottom, groundY));
      path.close();
    }
    // Gövde
    path.addRect(Skia.XYWHRect(cx - w * 0.05, groundY - h * 0.15, w * 0.1, h * 0.15));
  }
  path.addRect(Skia.XYWHRect(-10, groundY - 1, width + 20, 4));
  return path.build();
}

/** Ot sırası: ince dikey çizgiler. */
function grassRow(width: number, groundY: number, height: number, seed: number): SkPath {
  const rnd = mulberry(seed);
  const path = Skia.PathBuilder.Make();
  path.addRect(Skia.XYWHRect(-10, groundY, width + 20, height - groundY + 10));
  for (let x = -4; x < width + 4; x += 3 + rnd() * 4) {
    const h = 6 + rnd() * 18;
    const lean = (rnd() - 0.5) * 6;
    path.moveTo(x - 1.2, groundY + 1);
    path.lineTo(x + lean, groundY - h);
    path.lineTo(x + 1.2, groundY + 1);
    path.close();
  }
  return path.build();
}

/**
 * Arka plan: gece gradyanı ve 3 katman ağaç silueti (uzak / orta / yakın) + çimen.
 * Aydınlık arttıkça gradyan açılır, ağaç kenarları ışık alır.
 */
export function Backdrop({ width, height, brightness }: Props) {
  const layers = useMemo(
    () => ({
      far: pineRow(width, height * 0.62, 9, height * 0.18, height * 0.3, 11),
      mid: pineRow(width, height * 0.7, 6, height * 0.26, height * 0.4, 23),
      near: pineRow(width, height * 0.8, 4, height * 0.34, height * 0.5, 37),
      grass: grassRow(width, height * 0.9, height, 51),
    }),
    [width, height],
  );

  const bgColors = useDerivedValue(() => [
    interpolateColor(brightness.value, [0, 1], [COLORS.backgroundTop, COLORS.backgroundLitTop]),
    interpolateColor(brightness.value, [0, 1], [COLORS.background, COLORS.backgroundLit]),
  ]);
  const rimOpacity = useDerivedValue(() => 0.12 + 0.7 * brightness.value);
  const farOpacity = useDerivedValue(() => 0.55 + 0.45 * brightness.value);

  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={bgColors} />
      </Rect>
      <Group opacity={farOpacity}>
        <Path path={layers.far} color={COLORS.treeFar} />
      </Group>
      {/* Işık kenarı: aynı siluet biraz yukarı kaydırılıp arkaya çizilir, üst kenarlar parlar. */}
      <Group opacity={rimOpacity} transform={RIM_OFFSET}>
        <Path path={layers.mid} color={COLORS.treeRim} />
      </Group>
      <Path path={layers.mid} color={COLORS.treeMid} />
      <Group opacity={rimOpacity} transform={RIM_OFFSET}>
        <Path path={layers.near} color={COLORS.treeRim} />
      </Group>
      <Path path={layers.near} color={COLORS.treeNear} />
      <Path path={layers.grass} color={COLORS.grass} />
    </Group>
  );
}

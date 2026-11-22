import {
  BlurMask,
  Circle,
  Group,
  RoundedRect,
  rect,
  rrect,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { COLORS, JAR } from '../config/balance';

type Props = {
  x: number;
  y: number;
  count: SharedValue<number>;
  capacity: SharedValue<number>;
  /** Simülasyon zamanı (sn); dolu kavanozun nefes alması için. */
  time: SharedValue<number>;
};

const W = JAR.width;
const H = JAR.height;

/** Kavanoz: doldukça içi parlar, doluyken nefes alır ve titrer. */
export function Jar({ x, y, count, capacity, time }: Props) {
  const fill = useDerivedValue(() => Math.min(1, count.value / Math.max(1, capacity.value)));
  const full = useDerivedValue(() => (count.value >= capacity.value ? 1 : 0));

  const transform = useDerivedValue(() => {
    const t = time.value;
    const pulse = 1 + full.value * JAR.pulseScale * Math.sin((t / JAR.pulsePeriod) * Math.PI * 2);
    const shake = full.value * JAR.shakeAmplitude * Math.sin(t * 40);
    return [{ translateX: x + shake }, { translateY: y }, { scale: pulse }];
  });

  const innerH = H - 22;
  const liquid = useDerivedValue(() => {
    const h = innerH * fill.value;
    return rrect(rect(-W / 2 + 7, H / 2 - 6 - h, W - 14, h), 10, 10);
  });
  const glowOpacity = useDerivedValue(() => 0.15 + 0.85 * fill.value);
  const haloR = useDerivedValue(() => W * (0.6 + 0.5 * fill.value + 0.15 * full.value));

  return (
    <Group transform={transform}>
      {/* Dış hale */}
      <Group opacity={glowOpacity} blendMode="plus">
        <Circle cx={0} cy={8} r={haloR} color={`${COLORS.jarGlow}55`}>
          <BlurMask blur={24} style="normal" />
        </Circle>
      </Group>
      {/* Işık dolgusu */}
      <Group opacity={glowOpacity} blendMode="plus">
        <RoundedRect rect={liquid} color={`${COLORS.jarGlow}cc`}>
          <BlurMask blur={6} style="solid" />
        </RoundedRect>
      </Group>
      {/* Cam */}
      <RoundedRect
        x={-W / 2}
        y={-H / 2 + 10}
        width={W}
        height={H - 10}
        r={16}
        color={`${COLORS.jarGlass}22`}
      />
      <RoundedRect
        x={-W / 2}
        y={-H / 2 + 10}
        width={W}
        height={H - 10}
        r={16}
        color={`${COLORS.jarGlass}aa`}
        style="stroke"
        strokeWidth={2}
      />
      {/* Kapak */}
      <RoundedRect x={-W / 2 + 8} y={-H / 2} width={W - 16} height={12} r={4} color="#5a4a3a" />
    </Group>
  );
}

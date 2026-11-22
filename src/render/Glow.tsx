import { Circle, Group, RadialGradient, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { COLORS, RING } from '../config/balance';

type Props = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  radius: SharedValue<number>;
  /** 0..1, parmak kalkınca söner. */
  visibility: SharedValue<number>;
};

/** Parmağın altındaki yarı saydam toplama halkası. */
export function CollectRing({ x, y, radius, visibility }: Props) {
  const opacity = useDerivedValue(() => RING.opacity * visibility.value);
  const center = useDerivedValue(() => vec(x.value, y.value));
  return (
    <Group opacity={opacity} blendMode="plus">
      <Circle cx={x} cy={y} r={radius}>
        <RadialGradient
          c={center}
          r={radius}
          colors={[`${COLORS.ring}00`, `${COLORS.ring}33`, `${COLORS.ring}cc`, `${COLORS.ring}00`]}
          positions={[0, 0.7, 0.93, 1]}
        />
      </Circle>
    </Group>
  );
}

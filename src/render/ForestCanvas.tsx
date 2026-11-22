import { Canvas, Rect, LinearGradient, vec } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { COLORS } from '../config/balance';

/** Skia sahnesi. Faz 1: yalnızca koyu gradyan arka plan. */
export function ForestCanvas() {
  const { width, height } = useWindowDimensions();
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[COLORS.backgroundTop, COLORS.background]}
        />
      </Rect>
    </Canvas>
  );
}

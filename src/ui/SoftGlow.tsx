import type { ComponentProps } from 'react';
import { Image, type ImageStyle } from 'react-native';
import Animated from 'react-native-reanimated';

const GLOW = require('../../assets/ui/soft_glow.png') as number;

type Props = {
  size: number;
  color: string;
  style?: ComponentProps<typeof Animated.Image>['style'];
  animated?: boolean;
};

/**
 * Yumuşak parıltı: merkezden kenara solan beyaz bir doku, istenen renge boyanır.
 * Düz renkli bir daire (borderRadius + backgroundColor) telefonda keskin, opak bir disk gibi
 * görünüyordu; bu doku her platformda aynı yumuşak ışığı verir.
 */
export function SoftGlow({ size, color, style, animated }: Props) {
  const base: ImageStyle = { position: 'absolute', width: size, height: size, tintColor: color };
  if (animated) return <Animated.Image source={GLOW} pointerEvents="none" style={[base, style]} />;
  return <Image source={GLOW} pointerEvents="none" style={[base, style as ComponentProps<typeof Image>['style']]} />;
}

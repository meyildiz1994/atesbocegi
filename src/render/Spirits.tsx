import {
  Atlas,
  Circle,
  RadialGradient,
  Skia,
  useColorBuffer,
  useRSXformBuffer,
  useTexture,
  vec,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { SIM, SPIRIT } from '../config/balance';
import type { SimState } from '../game/simulation';

const T = SIM.textureSize;
/** Modül düzeyinde sabit: useTexture boyut nesnesi değişince dokuyu yeniden oluşturur
 * (her render'da yeni nesne = her render'da yeni offscreen yüzey; web'de WebGL bağlamı tükeniyordu). */
const TEXTURE_SIZE = { width: T, height: T };
const HALF = T / 2;
const SCALE = SPIRIT.spriteSize / T;
const N = SPIRIT.maxOnScreen;

function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const RGB = hexToRgb01(SPIRIT.color);

/** Işık Ruhları: büyükçe, soğuk mavi, yavaşça nabız atan ışık topları. */
export function Spirits({ sim }: { sim: SharedValue<SimState> }) {
  const texture = useTexture(
    <Circle cx={HALF} cy={HALF} r={HALF}>
      <RadialGradient
        c={vec(HALF, HALF)}
        r={HALF}
        colors={['#ffffffff', '#ffffffaa', '#ffffff33', '#ffffff00']}
        positions={[0, 0.15, 0.45, 1]}
      />
    </Circle>,
    TEXTURE_SIZE,
  );
  const sprites = useMemo(() => new Array(N).fill(0).map(() => Skia.XYWHRect(0, 0, T, T)), []);

  const transforms = useRSXformBuffer(N, (val, k) => {
    'worklet';
    const s = sim.value;
    if (k >= s.spiritCount) {
      val.set(0, 0, -1000, -1000);
      return;
    }
    const pulse = 1 + 0.12 * Math.sin(s.time * 3 + k * 1.7);
    const sc = SCALE * pulse;
    val.set(sc, 0, s.spX[k]! - sc * HALF, s.spY[k]! - sc * HALF);
  });
  const colors = useColorBuffer(N, (val, k) => {
    'worklet';
    const s = sim.value;
    val[0] = RGB[0];
    val[1] = RGB[1];
    val[2] = RGB[2];
    val[3] = k < s.spiritCount ? 0.9 : 0;
  });

  return (
    <Atlas
      image={texture}
      sprites={sprites}
      transforms={transforms}
      colors={colors}
      colorBlendMode="modulate"
      blendMode="plus"
    />
  );
}

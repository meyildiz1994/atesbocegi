import {
  Atlas,
  Circle,
  Group,
  RadialGradient,
  Skia,
  useColorBuffer,
  useRSXformBuffer,
  useTexture,
  vec,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { FX, SIM } from '../config/balance';
import { fireflyBrightness, STATUS_DEAD, type SimState } from '../game/simulation';

type Props = {
  sim: SharedValue<SimState>;
  /** Bölge rengi, 0..1 RGB. */
  tint: SharedValue<[number, number, number]>;
  /** core: parlak çekirdek; halo: büyük, soluk ikinci katman. */
  layer?: 'core' | 'halo';
};

const T = SIM.textureSize;
/** Modül düzeyinde sabit: useTexture boyut nesnesi değişince dokuyu yeniden oluşturur
 * (her render'da yeni nesne = her render'da yeni offscreen yüzey; web'de WebGL bağlamı tükeniyordu). */
const TEXTURE_SIZE = { width: T, height: T };
const HALF = T / 2;
const SCALE = SIM.spriteSize / T;

/** Hale dokusu: yumuşak, düz düşen ışık. */
function HaloSprite() {
  return (
    <Circle cx={HALF} cy={HALF} r={HALF}>
      <RadialGradient
        c={vec(HALF, HALF)}
        r={HALF}
        colors={['#ffffffff', '#ffffff55', '#ffffff14', '#ffffff00']}
        positions={[0, 0.25, 0.6, 1]}
      />
    </Circle>
  );
}

/** Glow dokusu: parlak çekirdek + geniş, soluk hale. Tek sefer çizilir. */
function GlowSprite() {
  return (
    <Group>
      <Circle cx={HALF} cy={HALF} r={HALF}>
        <RadialGradient
          c={vec(HALF, HALF)}
          r={HALF}
          colors={['#ffffffff', '#ffffffee', '#ffffff70', '#ffffff1c', '#ffffff00']}
          positions={[0, 0.07, 0.16, 0.45, 1]}
        />
      </Circle>
    </Group>
  );
}

/**
 * Tüm ateşböcekleri tek bir Atlas çağrısıyla (tek draw call) çizilir.
 * Konum ve parlaklık UI thread'de, simülasyon state'inden okunur.
 */
export function Fireflies({ sim, tint, layer = 'core' }: Props) {
  const halo = layer === 'halo';
  const scaleMul = halo ? SCALE * FX.haloScale : SCALE;
  const alphaMul = halo ? FX.haloAlpha : 1;
  const capacity = SIM.capacity;
  const texture = useTexture(halo ? <HaloSprite /> : <GlowSprite />, TEXTURE_SIZE);
  const sprites = useMemo(
    () => new Array(capacity).fill(0).map(() => Skia.XYWHRect(0, 0, T, T)),
    [capacity],
  );

  const transforms = useRSXformBuffer(capacity, (val, i) => {
    'worklet';
    const s = sim.value;
    if (s.status[i] === STATUS_DEAD) {
      val.set(0, 0, -1000, -1000);
      return;
    }
    const b = fireflyBrightness(s, i);
    const scale = scaleMul * (0.75 + 0.35 * b);
    val.set(scale, 0, s.x[i]! - scale * HALF, s.y[i]! - scale * HALF);
  });

  const colors = useColorBuffer(capacity, (val, i) => {
    'worklet';
    const s = sim.value;
    const c = tint.value;
    const a = s.status[i] === STATUS_DEAD ? 0 : fireflyBrightness(s, i);
    val[0] = c[0];
    val[1] = c[1];
    val[2] = c[2];
    val[3] = a * alphaMul;
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

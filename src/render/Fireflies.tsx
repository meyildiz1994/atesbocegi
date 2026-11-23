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

import { CRYSTAL, FOG, FX, KIND, SIM, WIND } from '../config/balance';
import { fireflyBrightness, inFog, STATUS_DEAD, type SimState } from '../game/simulation';

type Props = {
  sim: SharedValue<SimState>;
  /** Bölge rengi, 0..1 RGB. */
  tint: SharedValue<[number, number, number]>;
  /** core: parlak çekirdek; halo: büyük, soluk ikinci katman. */
  layer?: 'core' | 'halo';
  /** Kaç indeksin çizileceği (FX.drawBuckets'tan). */
  count?: number;
};

const T = SIM.textureSize;
/** Modül düzeyinde sabit: useTexture boyut nesnesi değişince dokuyu yeniden oluşturur
 * (her render'da yeni nesne = her render'da yeni offscreen yüzey; web'de WebGL bağlamı tükeniyordu). */
const TEXTURE_SIZE = { width: T, height: T };
const HALF = T / 2;
const SCALE = SIM.spriteSize / T;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
/** Türe göre renk (0: bölge rengi). */
const KIND_RGB: [number, number, number][] = [[1, 1, 1], rgb(CRYSTAL.colors[0]), rgb(CRYSTAL.colors[1]), rgb(CRYSTAL.colors[2]), rgb(WIND.color)];
const KIND_SCALE = [1, 1.2, 1.2, 1.2, 1.8];

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
export function Fireflies({ sim, tint, layer = 'core', count = SIM.capacity }: Props) {
  const halo = layer === 'halo';
  const scaleMul = halo ? SCALE * FX.haloScale : SCALE;
  const alphaMul = halo ? FX.haloAlpha : 1;
  const capacity = Math.min(count, SIM.capacity);
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
    const scale = scaleMul * (0.75 + 0.35 * b) * KIND_SCALE[s.kind[i]!]!;
    val.set(scale, 0, s.x[i]! - scale * HALF, s.y[i]! - scale * HALF);
  });

  const colors = useColorBuffer(capacity, (val, i) => {
    'worklet';
    const s = sim.value;
    const k = s.kind[i]!;
    const c = k === KIND.normal ? tint.value : KIND_RGB[k]!;
    let a = s.status[i] === STATUS_DEAD ? 0 : fireflyBrightness(s, i);
    if (k === KIND.wind) a = 0.7 + 0.3 * a;
    if (a > 0 && inFog(s, i)) a *= FOG.hiddenAlpha;
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

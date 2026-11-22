import { BlurMask, Circle, Group, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { COLORS, JAR } from '../config/balance';

type Props = {
  x: number;
  y: number;
  /** Patlamanın ilerlemesi: 0 başlangıç, 1 bitti (boştayken 1). */
  progress: SharedValue<number>;
  /** Boşaltılan kavanozun doluluk oranı (0..1): etkinin gücü. */
  power: SharedValue<number>;
};

const H = JAR.height;
/** Patlamanın çıktığı yer: kavanozun ağzına yakın. */
const OY = -H * 0.12;

/** Sabit, rastgele görünen kıvılcım yönleri (yukarı doğru yelpaze). */
const SPARKS = Array.from({ length: JAR.burstSparks }, (_, i) => {
  const r1 = Math.sin(i * 91.17) * 43758.5453;
  const r2 = Math.sin(i * 17.31) * 24634.6345;
  const f1 = r1 - Math.floor(r1);
  const f2 = r2 - Math.floor(r2);
  const angle = -Math.PI / 2 + (f1 - 0.5) * Math.PI * 1.35;
  return { angle, speed: 120 + 170 * f2, size: 2 + 2.5 * f1, warm: i % 3 === 0 };
});

const RAYS = Array.from({ length: JAR.burstRays }, (_, i) => ({ angle: (i / JAR.burstRays) * 360 }));

function Spark({ angle, speed, size, warm, progress, power }: (typeof SPARKS)[number] & Omit<Props, 'x' | 'y'>) {
  const cx = useDerivedValue(() => Math.cos(angle) * speed * progress.value * (0.6 + 0.4 * power.value));
  // Yukarı fırlar, sonra hafifçe süzülerek düşer.
  const cy = useDerivedValue(() => {
    const p = progress.value;
    return OY + Math.sin(angle) * speed * p * (0.6 + 0.4 * power.value) + 90 * p * p;
  });
  const r = useDerivedValue(() => size * (1 - 0.6 * progress.value));
  const opacity = useDerivedValue(() => (progress.value >= 1 ? 0 : Math.pow(1 - progress.value, 1.4)));
  return (
    <Circle cx={cx} cy={cy} r={r} color={warm ? COLORS.jarFull : COLORS.jarGlow} opacity={opacity}>
      <BlurMask blur={2.5} style="solid" />
    </Circle>
  );
}

function Ray({ angle, progress, power }: { angle: number } & Omit<Props, 'x' | 'y'>) {
  const transform = useDerivedValue(() => [{ translateY: OY }, { rotate: ((angle + progress.value * 40) * Math.PI) / 180 }]);
  const len = useDerivedValue(() => (60 + 110 * power.value) * Math.sin(Math.min(1, progress.value * 1.6) * Math.PI * 0.5));
  const opacity = useDerivedValue(() => (progress.value >= 1 ? 0 : 0.55 * Math.pow(1 - progress.value, 2)));
  return (
    <Group transform={transform} opacity={opacity}>
      <Rect x={-2.5} y={0} width={5} height={len} color={COLORS.jarFull}>
        <BlurMask blur={4} style="normal" />
      </Rect>
    </Group>
  );
}

/**
 * Kavanoz boşaltılınca: beyaz-altın bir parlama, genişleyen ışık halkası, dönen ışınlar ve
 * yukarı saçılan kıvılcımlar. Dolu kavanozda en güçlü, az dolu kavanozda sönük.
 */
export function JarBurst({ x, y, progress, power }: Props) {
  const visible = useDerivedValue(() => (progress.value < 1 ? 1 : 0));
  const flashR = useDerivedValue(() => (60 + 120 * power.value) * (0.4 + 0.6 * Math.sqrt(progress.value)));
  const flashOpacity = useDerivedValue(() => Math.pow(1 - progress.value, 2.2) * (0.5 + 0.5 * power.value));
  const ringR = useDerivedValue(() => 20 + (110 + 80 * power.value) * progress.value);
  const ringOpacity = useDerivedValue(() => 0.9 * Math.pow(1 - progress.value, 1.6));
  const ringWidth = useDerivedValue(() => 2 + 8 * (1 - progress.value));
  const center = vec(0, OY);

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]} opacity={visible} blendMode="plus">
      {/* Parlama */}
      <Circle cx={0} cy={OY} r={flashR} opacity={flashOpacity}>
        <RadialGradient c={center} r={flashR} colors={['#fffbe8ff', `${COLORS.jarFull}cc`, `${COLORS.jarGlow}00`]} />
      </Circle>
      {/* Işınlar */}
      {RAYS.map((r, i) => (
        <Ray key={i} angle={r.angle} progress={progress} power={power} />
      ))}
      {/* Genişleyen halka */}
      <Circle cx={0} cy={OY} r={ringR} style="stroke" strokeWidth={ringWidth} color={COLORS.jarGlow} opacity={ringOpacity}>
        <BlurMask blur={3} style="solid" />
      </Circle>
      {/* Kıvılcımlar */}
      {SPARKS.map((s, i) => (
        <Spark key={i} {...s} progress={progress} power={power} />
      ))}
    </Group>
  );
}

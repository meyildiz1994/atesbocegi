import {
  BlurMask,
  Circle,
  Group,
  Image,
  LinearGradient,
  RadialGradient,
  Rect,
  vec,
  RoundedRect,
  rect,
  rrect,
  useImage,
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
  /** Boşaltma patlamasının ilerlemesi (0..1); kavanoz bir an esneyip zıplar. */
  burst?: SharedValue<number>;
};

const W = JAR.width;
const H = JAR.height;
const G = JAR.glass;
const gx = -W / 2 + W * G.left;
const gw = W * (G.right - G.left);
const gTop = -H / 2 + H * G.top;
const gBottom = -H / 2 + H * G.bottom;
const gr = W * G.radius;

const JAR_IMAGE = require('../../assets/ui/jar.png');

/** Kavanozun içinde uçuşan küçük ateşböcekleri: sabit konumlar (u, v ∈ 0..1, v=0 dip), dolum seviyesine kadar görünür. */
const SPARKS = Array.from({ length: JAR.sparks }, (_, i) => {
  const r1 = Math.sin(i * 12.9898) * 43758.5453;
  const r2 = Math.sin(i * 78.233) * 12543.123;
  return { u: 0.12 + 0.76 * (r1 - Math.floor(r1)), v: 0.05 + 0.9 * (i / JAR.sparks), phase: (r2 - Math.floor(r2)) * 6.28 };
});

function Spark({ u, v, phase, fill, time }: { u: number; v: number; phase: number; fill: SharedValue<number>; time: SharedValue<number> }) {
  const cx = useDerivedValue(() => gx + gw * u + 2.5 * Math.sin(time.value * 1.3 + phase));
  const cy = useDerivedValue(() => gBottom - (gBottom - gTop) * v + 2 * Math.cos(time.value * 1.1 + phase));
  const opacity = useDerivedValue(() => (v < fill.value ? 0.55 + 0.45 * Math.sin(time.value * 3 + phase) : 0));
  return (
    <Circle cx={cx} cy={cy} r={2.8} color={COLORS.jarGlow} opacity={opacity}>
      <BlurMask blur={2} style="solid" />
    </Circle>
  );
}

/**
 * Kavanoz: ChatGPT ile çizilmiş cam kavanoz görseli; içindeki ışık kodla çizilir.
 * Doldukça içi parlar, doluyken nefes alır ve titrer.
 */
export function Jar({ x, y, count, capacity, time, burst }: Props) {
  const image = useImage(JAR_IMAGE);
  const fill = useDerivedValue(() => Math.min(1, count.value / Math.max(1, capacity.value)));
  const full = useDerivedValue(() => (count.value >= capacity.value ? 1 : 0));

  const transform = useDerivedValue(() => {
    const t = time.value;
    const pulse = 1 + full.value * JAR.pulseScale * Math.sin((t / JAR.pulsePeriod) * Math.PI * 2);
    const shake = full.value * JAR.shakeAmplitude * Math.sin(t * 40);
    const b = burst ? burst.value : 1;
    // Boşaltınca: önce yassılır, sonra yaylanarak uzar ve yerine oturur.
    const pop = b < 1 ? Math.sin(b * Math.PI * 3) * Math.pow(1 - b, 2) * 0.16 : 0;
    return [{ translateX: x + shake }, { translateY: y - pop * 40 }, { scaleX: pulse * (1 - pop) }, { scaleY: pulse * (1 + pop) }];
  });

  const liquid = useDerivedValue(() => {
    const h = (gBottom - gTop) * fill.value;
    return rrect(rect(gx, gBottom - h, gw, h), gr, gr);
  });
  const glowOpacity = useDerivedValue(() => 0.12 + 0.88 * fill.value);
  const haloR = useDerivedValue(() => W * (0.55 + 0.5 * fill.value + 0.15 * full.value));
  /** Işık yüzeyi: dolum seviyesinin net görünmesi için parlak çizgi. */
  const surfaceY = useDerivedValue(() => gBottom - (gBottom - gTop) * fill.value - 1.5);
  const surfaceOpacity = useDerivedValue(() => (fill.value > 0.02 ? 0.95 : 0));
  /** Kavanozun altındaki doluluk çubuğu. */
  const barW = W * 0.78;
  const barFillW = useDerivedValue(() => Math.max(0.001, barW * fill.value));
  const barColor = useDerivedValue(() => (full.value ? COLORS.jarFull : COLORS.jarGlow));
  const barOpacity = useDerivedValue(() => (full.value ? 0.75 + 0.25 * Math.sin(time.value * 8) : 1));

  return (
    <Group transform={transform}>
      {/* Dış hale */}
      <Group opacity={glowOpacity} blendMode="plus">
        <Circle cx={0} cy={(gTop + gBottom) / 2} r={haloR} color={`${COLORS.jarGlow}44`}>
          <BlurMask blur={26} style="normal" />
        </Circle>
      </Group>
      {/* Cam kavanoz görseli (yüklenene kadar sade bir cam) */}
      {image ? (
        <Image image={image} x={-W / 2} y={-H / 2} width={W} height={H} fit="contain" />
      ) : (
        <RoundedRect x={gx} y={gTop} width={gw} height={gBottom - gTop} r={gr} color={`${COLORS.jarGlass}33`} />
      )}
      {/* Camın içindeki ışık sıvısı: dipte sıcak ve yoğun, yüzeye doğru açılır; seviye net okunur */}
      <RoundedRect rect={liquid} opacity={0.72}>
        <LinearGradient
          start={vec(0, gBottom)}
          end={vec(0, gTop)}
          colors={[`${COLORS.jarFull}ff`, `${COLORS.jarGlow}cc`]}
        />
      </RoundedRect>
      <Group opacity={glowOpacity} blendMode="plus">
        <RoundedRect rect={liquid}>
          <RadialGradient
            c={vec(0, (gTop + gBottom) / 2 + 8)}
            r={gw * 0.75}
            colors={[`${COLORS.jarGlow}90`, `${COLORS.jarGlow}30`]}
          />
          <BlurMask blur={7} style="normal" />
        </RoundedRect>
        <Rect x={gx + 4} y={surfaceY} width={gw - 8} height={3} color={COLORS.jarGlow} opacity={surfaceOpacity}>
          <BlurMask blur={2} style="solid" />
        </Rect>
        {SPARKS.map((sp, i) => (
          <Spark key={i} {...sp} fill={fill} time={time} />
        ))}
      </Group>
      {/* Doluluk çubuğu */}
      <RoundedRect x={-barW / 2} y={H / 2 + 6} width={barW} height={6} r={3} color="#0a1a1fcc" />
      <RoundedRect x={-barW / 2} y={H / 2 + 6} width={barFillW} height={6} r={3} color={barColor} opacity={barOpacity}>
        <BlurMask blur={1.5} style="solid" />
      </RoundedRect>
    </Group>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { MUSHROOM, SIM } from '../../config/balance';
import { formatNumber } from '../../game/numbers';
import { useGame, useStats } from '../../game/state';
import { queuePulse } from '../../game/zoneBus';
import { chainOrder, chainReward, isPerfectTap } from '../../game/zoneMechanics';
import { skyEffects } from '../../game/constellations';
import { moonRules } from '../../game/moonCycle';
import { t } from '../../i18n';
import { playSfx } from '../../services/audio';
import { hapticJarEmpty, hapticSuccess } from '../../services/haptics';
import { SoftGlow } from '../SoftGlow';

const CAP = 46;
const TICK_MS = 200;

type Spot = { ripeAt: number; rotAt: number; burstN: number };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clock = () => Date.now();
const AUTO_MS = 500;

function freshSpot(now: number, first = false): Spot {
  const grow = MUSHROOM.ripenSec * 1000 * (first ? rnd(0.15, 1) : rnd(0.8, 1.3));
  // Ay Döngüsü: olgun kalma süresi kısalır.
  const ripe = MUSHROOM.ripeSec * 1000 * moonRules(useGame.getState().moonCycle).ripe;
  return { ripeAt: now + grow, rotAt: now + grow + ripe, burstN: 0 };
}

/** Mantar Vadisi: olgunlaşan mantarlar; dokununca zincirleme patlar ve böcekleri kavanoza yollar. */
export function Mushrooms() {
  const { width, height } = useWindowDimensions();
  const bottom = height * SIM.playAreaBottom;
  const pos: [number, number][] = MUSHROOM.spots.map(([u, v]) => [width * u, bottom * v]);
  const stats = useStats();
  const grant = useGame((s) => s.grantLight);
  const [spots, setSpots] = useState<Spot[]>(() => MUSHROOM.spots.map(() => freshSpot(Date.now(), true)));
  const [now, setNow] = useState(() => Date.now());
  const [label, setLabel] = useState<{ id: number; text: string; x: number; y: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tapRef = useRef<(i: number) => void>(() => {});
  const spotsRef = useRef(spots);

  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      // Bahçıvan takımyıldızı: çürümek üzere olan mantar kendiliğinden patlar.
      if (skyEffects(useGame.getState().sky).autoMushroom) {
        const k = spotsRef.current.findIndex((s) => n >= s.rotAt - AUTO_MS && n < s.rotAt);
        if (k >= 0) tapRef.current(k);
      }
      // Olgun kalma süresi geçen mantar söner ve yeniden büyür.
      setSpots((list) => (list.some((s) => n >= s.rotAt) ? list.map((s) => (n >= s.rotAt ? freshSpot(n) : s)) : list));
    }, TICK_MS);
    const pending = timers.current;
    return () => {
      clearInterval(id);
      pending.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!label) return;
    const id = setTimeout(() => setLabel(null), 1400);
    return () => clearTimeout(id);
  }, [label]);

  const ripe = spots.map((s) => now >= s.ripeAt && now < s.rotAt);

  const onTap = (i: number) => {
    const tapNow = clock();
    const s = spots[i];
    if (!s || tapNow < s.ripeAt || tapNow >= s.rotAt) return;
    const perfect = isPerfectTap((tapNow - s.ripeAt) / 1000);
    const ripeNow = spots.map((x) => tapNow >= x.ripeAt && tapNow < x.rotAt);
    const order = chainOrder(i, ripeNow, pos);
    const radius = MUSHROOM.burstRadius * (perfect ? MUSHROOM.perfectRadiusMult : 1);
    // Zincirdeki mantarlar hemen "patladı" sayılır (iki kez dokunulmasın), patlamalar sırayla olur.
    setSpots((list) =>
      list.map((x, j) => (order.some(([k]) => k === j) ? { ...freshSpot(tapNow), burstN: x.burstN + 1 } : x)),
    );
    order.forEach(([k, depth]) => {
      const fire = () => {
        const p = pos[k]!;
        queuePulse(p[0], p[1], radius);
        hapticJarEmpty();
        playSfx('sfx_jar_empty', { pitch: 1 + depth * 0.12, volume: 0.5 });
      };
      if (depth === 0) fire();
      else timers.current.push(setTimeout(fire, depth * MUSHROOM.chainDelay * 1000));
    });
    const reward = chainReward(order.length, stats.jarCapacity * stats.valuePerFirefly) * skyEffects(useGame.getState().sky).mushroomReward;
    grant(reward);
    if (perfect || order.length > 1) hapticSuccess();
    const p = pos[i]!;
    const parts = [order.length > 1 ? t('mushroom.chain', { n: order.length }) : '', perfect ? t('mushroom.perfect') : '', `+${formatNumber(reward)}`];
    setLabel({ id: tapNow, text: parts.filter(Boolean).join('  '), x: p[0], y: p[1] - CAP });
  };

  useEffect(() => {
    tapRef.current = onTap;
    spotsRef.current = spots;
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {spots.map((s, i) => {
        const p = pos[i]!;
        const growth = Math.min(1, Math.max(0, 1 - (s.ripeAt - now) / (MUSHROOM.ripenSec * 1000)));
        return (
          <Mushroom
            key={i}
            x={p[0]}
            y={p[1]}
            ripe={ripe[i]!}
            growth={growth}
            ripeAt={s.ripeAt}
            burstN={s.burstN}
            onPress={() => onTap(i)}
          />
        );
      })}
      {label ? (
        <Animated.Text
          key={label.id}
          entering={ZoomIn.springify()}
          exiting={FadeOut}
          pointerEvents="none"
          style={[styles.label, { left: label.x - 110, top: label.y - 34 }]}
        >
          {label.text}
        </Animated.Text>
      ) : null}
    </View>
  );
}

function Mushroom({
  x,
  y,
  ripe,
  growth,
  ripeAt,
  burstN,
  onPress,
}: {
  x: number;
  y: number;
  ripe: boolean;
  growth: number;
  ripeAt: number;
  burstN: number;
  onPress: () => void;
}) {
  // Zamanlama halkası: olgunken 2× boyuttan mantarın boyuna kapanır, sonra yeniden başlar.
  const ring = useSharedValue(0);
  useEffect(() => {
    if (!ripe) {
      ring.value = 0;
      return;
    }
    const offset = ((Date.now() - ripeAt) / 1000 / MUSHROOM.pulsePeriod) % 1;
    ring.value = offset;
    ring.value = withSequence(
      withTiming(1, { duration: (1 - offset) * MUSHROOM.pulsePeriod * 1000, easing: Easing.linear }),
      withRepeat(
        withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: MUSHROOM.pulsePeriod * 1000, easing: Easing.linear })),
        -1,
      ),
    );
  }, [ripe, ripeAt, ring]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ripe ? 0.35 + 0.65 * ring.value : 0,
    transform: [{ scale: 2.1 - 1.1 * ring.value }],
  }));

  // Patlama halkası.
  const boom = useSharedValue(1);
  useEffect(() => {
    if (burstN === 0) return;
    boom.value = 0;
    boom.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [burstN, boom]);
  const boomStyle = useAnimatedStyle(() => ({
    opacity: boom.value >= 1 ? 0 : 1 - boom.value,
    transform: [{ scale: 0.6 + 3.4 * boom.value }],
  }));

  const scale = 0.55 + 0.45 * growth;
  return (
    <View pointerEvents="box-none" style={[styles.spot, { left: x - CAP, top: y - CAP }]}>
      <Animated.View pointerEvents="none" style={[styles.boom, boomStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      <Pressable
        onPress={onPress}
        disabled={!ripe}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('mushroom.a11y')}
        accessibilityState={{ disabled: !ripe }}
        style={[styles.hit, { transform: [{ scale }] }]}
      >
        {ripe ? <SoftGlow size={CAP * 2.4} color={RIPE} style={{ opacity: 0.6 }} /> : null}
        <View style={[styles.cap, ripe ? styles.capRipe : styles.capGrowing]}>
          <View style={[styles.dot, { left: 10, top: 8 }]} />
          <View style={[styles.dot, { left: 26, top: 5, width: 7, height: 7 }]} />
          <View style={[styles.dot, { left: 36, top: 12, width: 5, height: 5 }]} />
        </View>
        <View style={[styles.stem, ripe && styles.stemRipe]} />
      </Pressable>
    </View>
  );
}

const RIPE = '#ff9a4a';
const styles = StyleSheet.create({
  spot: { position: 'absolute', width: CAP * 2, height: CAP * 2, alignItems: 'center', justifyContent: 'center' },
  hit: { width: CAP + 8, height: CAP + 8, alignItems: 'center', justifyContent: 'center' },
  cap: {
    width: 48,
    height: 26,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  capGrowing: { backgroundColor: '#6a3a5a', opacity: 0.75 },
  capRipe: {
    backgroundColor: RIPE,
    shadowColor: RIPE,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  dot: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff3d6', opacity: 0.85 },
  stem: { width: 16, height: 16, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: '#c9b49a', opacity: 0.7 },
  stemRipe: { backgroundColor: '#fff0d0', opacity: 1 },
  ring: {
    position: 'absolute',
    width: CAP,
    height: CAP,
    borderRadius: CAP / 2,
    borderWidth: 2.5,
    borderColor: '#ffe2a8',
  },
  boom: {
    position: 'absolute',
    width: CAP,
    height: CAP,
    borderRadius: CAP / 2,
    borderWidth: 6,
    borderColor: RIPE,
  },
  label: {
    position: 'absolute',
    width: 220,
    textAlign: 'center',
    color: '#ffe2a8',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: RIPE,
    textShadowRadius: 10,
  },
});

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { FEVER, SIM } from '../../config/balance';
import { subscribeCombo } from '../../game/comboFeed';
import { formatNumber } from '../../game/numbers';
import { statsOf, useGame } from '../../game/state';
import { gameplayUnlocked } from '../../game/tutorial';
import { onPop, queuePulse, zoneLive } from '../../game/zoneBus';
import { skyEffects } from '../../game/constellations';
import { perkEffects } from '../../game/zoneMechanics';
import { t } from '../../i18n';
import { track } from '../../services/analytics';
import { playSfx } from '../../services/audio';
import { hapticSuccess } from '../../services/haptics';

type Phase = { kind: 'gather' } | { kind: 'pop'; mult: number; gain: number; n: number } | null;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Combo Fever: combo eşiği aşılınca (ya da arada bir kendiliğinden) bütün böcekler ekranın
 * ortasında toplanır, bir an kaynar ve "COMBO ×10" diye patlar. Patlayan her böcek ×10 Işık.
 */
export function ComboFever() {
  const { width, height } = useWindowDimensions();
  const cx = width / 2;
  const cy = height * SIM.playAreaBottom * 0.5;
  const unlocked = useGame((s) => gameplayUnlocked(s.tutorialStep));
  const [phase, setPhase] = useState<Phase>(null);
  const busy = useRef(false);
  const lastAt = useRef(0);
  const nextRandom = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mult = useRef<number>(FEVER.multiplier);

  useEffect(() => {
    if (!unlocked) return;
    const start = () => {
      const now = Date.now();
      if (busy.current || now - lastAt.current < FEVER.cooldownSec * 1000) return;
      busy.current = true;
      lastAt.current = now;
      nextRandom.current = now + rnd(FEVER.randomMinSec, FEVER.randomMaxSec) * 1000;
      mult.current = perkEffects(useGame.getState().perks).feverMult + skyEffects(useGame.getState().sky).feverBonus;
      zoneLive.value = { ...zoneLive.value, gatherOn: true, gatherX: cx, gatherY: cy };
      setPhase({ kind: 'gather' });
      playSfx('sfx_jar_empty', { pitch: 0.7, volume: 0.6 });
      timers.current.push(
        setTimeout(() => {
          zoneLive.value = { ...zoneLive.value, gatherOn: false };
          queuePulse(cx, cy, -FEVER.popRadius);
        }, FEVER.gatherSec * 1000),
      );
      // Patlama hiç böcek bulamazsa da kilit açılsın.
      timers.current.push(
        setTimeout(() => {
          busy.current = false;
        }, (FEVER.gatherSec + 2) * 1000),
      );
    };
    if (nextRandom.current === 0) nextRandom.current = Date.now() + rnd(FEVER.randomMinSec, FEVER.randomMaxSec) * 1000;
    const offCombo = subscribeCombo((count) => {
      const th = FEVER.comboThreshold * perkEffects(useGame.getState().perks).feverThresholdMult;
      if (count >= th) start();
    });
    const id = setInterval(() => {
      if (Date.now() >= nextRandom.current) start();
    }, 2000);
    const offPop = onPop((n) => {
      const s = useGame.getState();
      const gain = n * statsOf(s).valuePerFirefly * mult.current;
      s.grantLight(gain);
      hapticSuccess();
      playSfx('sfx_jar_empty', { pitch: 1.4 });
      track('combo_fever', { n, mult: mult.current });
      setPhase({ kind: 'pop', mult: mult.current, gain, n });
      timers.current.push(setTimeout(() => setPhase(null), 2200));
      busy.current = false;
    });
    const pending = timers.current;
    return () => {
      offCombo();
      offPop();
      clearInterval(id);
      pending.forEach(clearTimeout);
      zoneLive.value = { ...zoneLive.value, gatherOn: false };
    };
  }, [unlocked, cx, cy]);

  if (!phase) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {phase.kind === 'gather' ? <GatherGlow x={cx} y={cy} /> : <PopFlash x={cx} y={cy} />}
      {phase.kind === 'pop' ? (
        <Animated.View entering={ZoomIn.springify().damping(8)} exiting={FadeOut} style={[styles.slam, { top: cy - 70 }]}>
          <Text style={styles.combo}>COMBO ×{phase.mult}</Text>
          <Text style={styles.gain}>+{formatNumber(phase.gain)}</Text>
        </Animated.View>
      ) : (
        <Animated.Text entering={ZoomIn} exiting={FadeOut} style={[styles.fever, { top: cy - 130 }]}>
          {t('fever.title')}
        </Animated.Text>
      )}
    </View>
  );
}

function GatherGlow({ x, y }: { x: number; y: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: FEVER.gatherSec * 1000, easing: Easing.in(Easing.quad) });
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.15 + 0.5 * p.value, transform: [{ scale: 2.4 - 1.6 * p.value }] }));
  return <Animated.View style={[styles.glow, { left: x - 90, top: y - 90 }, style]} />;
}

function PopFlash({ x, y }: { x: number; y: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSequence(withSpring(1, { damping: 12 }), withTiming(2, { duration: 900 }));
  }, [p]);
  const ring = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - p.value * 0.5), transform: [{ scale: 0.5 + p.value * 2.2 }] }));
  const flash = useAnimatedStyle(() => ({ opacity: Math.max(0, 0.7 - p.value * 0.45) }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flash]} />
      <Animated.View style={[styles.ring, { left: x - 90, top: y - 90 }, ring]} />
    </>
  );
}

const GOLD = '#ffd24a';
const styles = StyleSheet.create({
  glow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: GOLD },
  ring: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 10, borderColor: GOLD },
  flash: { backgroundColor: '#fff6d0' },
  slam: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  combo: {
    color: GOLD,
    fontSize: 54,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
    textShadowColor: '#ff7a00',
    textShadowRadius: 18,
  },
  gain: { color: '#fffbe8', fontSize: 30, fontWeight: '900', textShadowColor: GOLD, textShadowRadius: 12 },
  fever: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#ffe9a0',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: GOLD,
    textShadowRadius: 14,
  },
});

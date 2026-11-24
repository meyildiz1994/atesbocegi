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
import { setFeverReadyAt, subscribeCombo } from '../../game/comboFeed';
import { formatNumber } from '../../game/numbers';
import { statsOf, useGame } from '../../game/state';
import { gameplayUnlocked } from '../../game/tutorial';
import { onPop, queuePulse, zoneLive } from '../../game/zoneBus';
import { skyEffects } from '../../game/constellations';
import { perkEffects } from '../../game/zoneMechanics';
import { t } from '../../i18n';
import { SoftGlow } from '../SoftGlow';
import { track } from '../../services/analytics';
import { playSfx } from '../../services/audio';
import { hapticSuccess } from '../../services/haptics';

type Phase = { kind: 'gather'; byCombo: boolean } | { kind: 'pop'; mult: number; gain: number; n: number } | null;

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
    const start = (byCombo: boolean) => {
      const now = Date.now();
      if (busy.current || now - lastAt.current < FEVER.cooldownSec * 1000) return;
      busy.current = true;
      lastAt.current = now;
      setFeverReadyAt(now + FEVER.cooldownSec * 1000);
      nextRandom.current = now + rnd(FEVER.randomMinSec, FEVER.randomMaxSec) * 1000;
      mult.current = perkEffects(useGame.getState().perks).feverMult + skyEffects(useGame.getState().sky).feverBonus;
      zoneLive.value = { ...zoneLive.value, gatherOn: true, gatherX: cx, gatherY: cy };
      setPhase({ kind: 'gather', byCombo });
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
      if (count >= th) start(true);
    });
    const id = setInterval(() => {
      if (Date.now() >= nextRandom.current) start(false);
    }, 2000);
    const offPop = onPop((n) => {
      const s = useGame.getState();
      const gain = n * statsOf(s).valuePerFirefly * mult.current;
      s.grantLight(gain);
      hapticSuccess();
      playSfx('sfx_jar_empty', { pitch: 1.4 });
      track('combo_fever', { n, mult: mult.current });
      setPhase({ kind: 'pop', mult: mult.current, gain, n });
      timers.current.push(setTimeout(() => setPhase(null), 1500));
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
        <Animated.View entering={ZoomIn.duration(220)} exiting={FadeOut.duration(400)} style={[styles.slam, { top: cy + 60 }]}>
          <Text style={styles.combo}>COMBO ×{phase.mult}</Text>
          <Text style={styles.gain}>+{formatNumber(phase.gain)}</Text>
        </Animated.View>
      ) : (
        <Animated.View entering={ZoomIn.duration(220)} exiting={FadeOut} style={[styles.slam, { top: cy + 110 }]}>
          <Text style={styles.fever}>{t('fever.title')}</Text>
          <Text style={styles.why}>{phase.byCombo ? t('fever.byCombo', { n: Math.round(FEVER.comboThreshold * perkEffects(useGame.getState().perks).feverThresholdMult) }) : t('fever.byChance')}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function GatherGlow({ x, y }: { x: number; y: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: FEVER.gatherSec * 1000, easing: Easing.in(Easing.quad) });
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.2 + 0.6 * p.value, transform: [{ scale: 1.6 - 0.8 * p.value }] }));
  return <SoftGlow animated size={GLOW} color={GOLD} style={[{ left: x - GLOW / 2, top: y - GLOW / 2 }, style]} />;
}

function PopFlash({ x, y }: { x: number; y: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [p]);
  // Kısa, hafif bir ışık patlaması: ekranı karartmaz, oyun akmaya devam eder.
  const burst = useAnimatedStyle(() => ({ opacity: 0.85 * (1 - p.value), transform: [{ scale: 0.6 + 1.4 * p.value }] }));
  return <SoftGlow animated size={GLOW} color={GOLD} style={[{ left: x - GLOW / 2, top: y - GLOW / 2 }, burst]} />;
}

const GOLD = '#ffd24a';
const GLOW = 360;
const styles = StyleSheet.create({
  slam: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  combo: {
    color: GOLD,
    fontSize: 40,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
    textShadowColor: '#ff7a00',
    textShadowRadius: 18,
  },
  gain: { color: '#fffbe8', fontSize: 30, fontWeight: '900', textShadowColor: GOLD, textShadowRadius: 12 },
  why: { color: '#fffbe8', fontSize: 13, fontWeight: '700', marginTop: 2, opacity: 0.9 },
  fever: {
    color: '#ffe9a0',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: GOLD,
    textShadowRadius: 14,
  },
});

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, WORLD_EVENTS } from '../../config/balance';
import { useGame } from '../../game/state';
import { gameplayUnlocked } from '../../game/tutorial';
import { zoneLive } from '../../game/zoneBus';
import { nextWorldEventAt, pickWorldEvent, type WorldEventKind } from '../../game/zoneMechanics';
import { t } from '../../i18n';
import { SoftGlow } from '../SoftGlow';
import { track } from '../../services/analytics';
import { hapticSuccess } from '../../services/haptics';

const clock = () => Date.now();

/** Rastgele dünya olayları: meteor yağmuru (böcekler 4× hızlı gelir) ve dolunay (×2 Işık). */
export function WorldEvents() {
  const insets = useSafeAreaInsets();
  const unlocked = useGame((s) => gameplayUnlocked(s.tutorialStep));
  const moonUntil = useGame((s) => s.moonUntil);
  const meteorUntil = useGame((s) => s.meteorUntil);
  const [now, setNow] = useState(clock);
  const nextAt = useRef(0);

  useEffect(() => {
    if (!unlocked) return;
    if (nextAt.current === 0) nextAt.current = nextWorldEventAt(clock(), useGame.getState().playTimeSec, Math.random());
    const id = setInterval(() => {
      const n = clock();
      setNow(n);
      const s = useGame.getState();
      // Meteor bitince doğma hızı normale döner.
      if (n >= s.meteorUntil && zoneLive.value.spawnMult !== 1) zoneLive.value = { ...zoneLive.value, spawnMult: 1 };
      if (n < nextAt.current || s.offlineReport || n < s.moonUntil || n < s.meteorUntil) return;
      const kind: WorldEventKind = pickWorldEvent(Math.random());
      s.startWorldEvent(kind, n);
      if (kind === 'meteor') zoneLive.value = { ...zoneLive.value, spawnMult: WORLD_EVENTS.meteor.spawnMult };
      hapticSuccess();
      track('world_event', { kind });
      nextAt.current = nextWorldEventAt(n, s.playTimeSec, Math.random());
    }, 1000);
    return () => clearInterval(id);
  }, [unlocked]);

  const moon = now < moonUntil;
  const meteor = now < meteorUntil;
  if (!moon && !meteor) return null;
  const left = Math.ceil(((moon ? moonUntil : meteorUntil) - now) / 1000);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {moon ? <Moon /> : <Meteors />}
      <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.banner, { top: insets.top + 100 }]}>
        <Text style={[styles.bannerText, moon && styles.moonText]}>{t(moon ? 'event.moon' : 'event.meteor')}</Text>
        <Text style={styles.left}>{t('event.left', { sec: left })}</Text>
      </Animated.View>
    </View>
  );
}

const HALO = 300;

function Moon() {
  const { width } = useWindowDimensions();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [p]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.4 + 0.2 * p.value, transform: [{ scale: 1 + 0.05 * p.value }] }));
  return (
    <Animated.View entering={FadeIn.duration(1500)} exiting={FadeOut.duration(1500)} style={[styles.moonWrap, { left: width - 150 }]}>
      <SoftGlow animated size={HALO} color={MOON} style={[{ left: (120 - HALO) / 2, top: (120 - HALO) / 2 }, halo]} />
      <View style={styles.moon} />
    </Animated.View>
  );
}

const METEORS = Array.from({ length: 7 }, (_, i) => ({ x: 0.1 + 0.13 * i, delay: i * 380, dur: 900 + (i % 3) * 250 }));

function Meteors() {
  const { width, height } = useWindowDimensions();
  return (
    <>
      {METEORS.map((m, i) => (
        <Meteor key={i} startX={width * m.x + 120} delay={m.delay} dur={m.dur} travel={height * 0.55} />
      ))}
    </>
  );
}

function Meteor({ startX, delay, dur, travel }: { startX: number; delay: number; dur: number; travel: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: Easing.in(Easing.quad) }), -1, false));
  }, [p, delay, dur]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.05 ? 0 : 1 - p.value,
    transform: [{ translateX: startX - travel * 0.6 * p.value }, { translateY: -40 + travel * p.value }, { rotate: '-31deg' }],
  }));
  return <Animated.View style={[styles.meteor, style]} />;
}

const MOON = '#f4f0d8';
const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  bannerText: { color: '#ffb070', fontSize: 13, fontWeight: '800' },
  moonText: { color: MOON },
  left: { color: COLORS.hudSubText, fontSize: 12, fontWeight: '700' },
  moonWrap: { position: 'absolute', top: 150, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  moon: { width: 74, height: 74, borderRadius: 37, backgroundColor: MOON, opacity: 0.92 },
  meteor: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 3,
    height: 70,
    borderRadius: 2,
    backgroundColor: '#ffe7b0',
    shadowColor: '#ffb070',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

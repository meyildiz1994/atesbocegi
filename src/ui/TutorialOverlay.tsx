import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, JAR, TUTORIAL, UI } from '../config/balance';
import { useGame } from '../game/state';
import { TUTORIAL_STEP } from '../game/tutorial';
import { t, type I18nKey } from '../i18n';
import { track } from '../services/analytics';
import { BAR_BUTTON, BAR_ICONS, BAR_LABELS, BAR_SLOTS, barSlotCenters } from './BottomBar';
import { metaButtonCenter } from './MetaButton';

const TOUR = [...BAR_SLOTS, 'garden'] as const;
type TourSlot = (typeof TOUR)[number];
const TOUR_ICONS: Record<TourSlot, number> = { ...BAR_ICONS, garden: require('../../assets/ui/icon_garden.png') as number };
const TOUR_LABELS: Record<TourSlot, I18nKey> = { ...BAR_LABELS, garden: 'meta.title' };
import { UI_ICONS } from './icons';

/** İpucu eli (ChatGPT ile üretildi). */
function Finger({ mode }: { mode: 'drag' | 'tap' }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: TUTORIAL.fingerLoopMs / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: TUTORIAL.fingerLoopMs / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [p]);
  const style = useAnimatedStyle(() =>
    mode === 'drag'
      ? { transform: [{ translateX: (p.value - 0.5) * TUTORIAL.fingerTravel }] }
      : { transform: [{ translateY: p.value * 10 }, { scale: 1 - p.value * 0.12 }] },
  );
  return <Animated.Image source={UI_ICONS.finger} style={[styles.finger, style]} />;
}

function Hint({ text, mode, style }: { text: string; mode: 'drag' | 'tap'; style: object }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(250)} style={[styles.hint, style]}>
      <Text style={styles.text}>{text}</Text>
      <Finger mode={mode} />
    </Animated.View>
  );
}

/** Onboarding ipuçları: dokunmaları engellemez. */
export function TutorialOverlay() {
  const step = useGame((s) => s.tutorialStep);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  if (step >= TUTORIAL_STEP.done) return null;
  if (step === TUTORIAL_STEP.tour) return <IconTour />;
  const up = barSlotCenters(width, height, insets).upgrades;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {step === TUTORIAL_STEP.drag ? (
        <Hint key="drag" text={t('hint.drag')} mode="drag" style={styles.center} />
      ) : null}
      {step === TUTORIAL_STEP.tapJar ? (
        <Hint
          key="jar"
          text={t('hint.tapJar')}
          mode="tap"
          style={[styles.centerX, { bottom: insets.bottom + JAR.bottomOffset + JAR.height / 2 + 8 }]}
        />
      ) : null}
      {step === TUTORIAL_STEP.upgrade ? (
        <Hint
          key="upgrade"
          text={t('hint.upgrade')}
          mode="tap"
          style={{ position: 'absolute', left: up.x - 80, width: 160, top: up.y - BAR_BUTTON / 2 - 100 }}
        />
      ) : null}
    </View>
  );
}

/** Alt çubuktaki ikonları tek tek tanıtır; her dokunuş bir sonrakine geçer. */
function IconTour() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [i, setI] = useState(0);
  const centers: Record<TourSlot, { x: number; y: number }> = {
    ...barSlotCenters(width, height, insets),
    garden: metaButtonCenter(insets),
  };
  const slot: TourSlot = TOUR[i] ?? 'settings';
  const c = centers[slot];
  const last = i === TOUR.length - 1;
  const cardPos = c.y > height / 2 ? { bottom: height - c.y + (BAR_BUTTON + 16) / 2 + 14 } : { top: c.y + (BAR_BUTTON + 16) / 2 + 14 };
  const next = () => {
    if (!last) {
      setI(i + 1);
      return;
    }
    useGame.getState().setTutorialStep(TUTORIAL_STEP.done);
    track('tutorial_complete', {});
  };
  const ring = BAR_BUTTON + 16;
  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={next} accessibilityRole="button" accessibilityLabel={t(last ? 'tour.start' : 'tour.next')} />
      <Animated.View
        key={slot}
        entering={FadeIn.duration(250)}
        pointerEvents="none"
        style={[styles.ring, { width: ring, height: ring, borderRadius: ring / 2, left: c.x - ring / 2, top: c.y - ring / 2 }]}
      >
        <Image source={TOUR_ICONS[slot]} style={styles.ringIcon} />
      </Animated.View>
      <Animated.View key={`card-${slot}`} entering={FadeIn.duration(250)} pointerEvents="box-none" style={[styles.card, cardPos]}>
        <Text style={styles.cardTitle}>{t(TOUR_LABELS[slot])}</Text>
        <Text style={styles.cardBody}>{t(`tour.${slot}` as I18nKey)}</Text>
        <View style={styles.cardRow}>
          <Text style={styles.dots}>{TOUR.map((_, k) => (k === i ? '●' : '○')).join(' ')}</Text>
          <Pressable onPress={next} style={styles.cardButton} accessibilityRole="button">
            <Text style={styles.cardButtonText}>{t(last ? 'tour.start' : 'tour.next')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: '#02060ccc' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.cardBgAffordable,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  ringIcon: { width: 42, height: 42 },
  card: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 16,
    gap: 6,
    borderRadius: 18,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  cardTitle: { color: COLORS.accent, fontSize: 20, fontWeight: '800' },
  cardBody: { color: COLORS.hudText, fontSize: 15, lineHeight: 21 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  dots: { color: COLORS.hudSubText, fontSize: 12, letterSpacing: 2 },
  cardButton: {
    minHeight: UI.minTouch,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardButtonText: { color: COLORS.accentText, fontSize: 16, fontWeight: '800' },
  hint: { position: 'absolute', alignItems: 'center', gap: 6 },
  center: { left: 0, right: 0, top: '42%' },
  centerX: { left: 0, right: 0 },
  right: { right: 20 },
  text: {
    color: COLORS.hudText,
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: COLORS.firefly,
    textShadowRadius: 10,
  },
  finger: { width: 40, height: 57 },
});

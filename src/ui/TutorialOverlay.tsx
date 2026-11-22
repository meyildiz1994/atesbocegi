import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { t } from '../i18n';
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
  if (step >= TUTORIAL_STEP.done) return null;

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
          style={[styles.right, { bottom: insets.bottom + UI.minTouch + 24 }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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

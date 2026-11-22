import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { COLORS, UI } from '../config/balance';
import { useGame } from '../game/state';

/** Şafak getirilince ekranı sıcak bir beyazla doldurup yavaşça söner. */
export function DawnFlash() {
  const counter = useGame((s) => s.dawnCounter);
  const first = useRef(counter);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (counter === first.current) return;
    opacity.value = withSequence(
      withTiming(1, { duration: UI.dawnFlashMs * 0.25, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: UI.dawnFlashMs * 0.75, easing: Easing.in(Easing.quad) }),
    );
  }, [counter, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, style]} />;
}

const styles = StyleSheet.create({ flash: { backgroundColor: COLORS.dawn } });

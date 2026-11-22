import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, COMBO } from '../config/balance';
import { currentCombo, subscribeCombo } from '../game/comboFeed';

/** Hızlı seri toplamada "×N" göstergesi; combo bitince söner. */
export function ComboCounter() {
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const pop = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = subscribeCombo((c) => {
      if (c >= COMBO.minShow) {
        setCount(c);
        opacity.value = withTiming(1, { duration: 80 });
        pop.value = withSequence(withTiming(1.25, { duration: 60 }), withSpring(1));
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (currentCombo() === 0) opacity.value = withTiming(0, { duration: 300 });
      }, COMBO.windowMs + 20);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [opacity, pop]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: pop.value }] }));
  return (
    <Animated.Text pointerEvents="none" style={[styles.text, { top: insets.top + 172 }, style]}>
      ×{count}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    alignSelf: 'center',
    color: COLORS.firefly,
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: COLORS.firefly,
    textShadowRadius: 14,
    fontVariant: ['tabular-nums'],
  },
});

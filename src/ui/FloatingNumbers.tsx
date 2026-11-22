import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { Easing, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { COLORS, FEEDBACK } from '../config/balance';
import { formatNumber } from '../game/numbers';

type Floater = { id: number; amount: number; x: number; y: number };

export type FloatingNumbersHandle = {
  spawn: (amount: number, x: number, y: number) => void;
};

let nextId = 1;

/** Kazanılan Işık'ın "+1.2K" gibi yukarı süzülüp kaybolan sayıları. */
export const FloatingNumbers = forwardRef<FloatingNumbersHandle>(function FloatingNumbers(_, ref) {
  const [items, setItems] = useState<Floater[]>([]);

  useImperativeHandle(ref, () => ({
    spawn: (amount, x, y) => {
      const id = nextId++;
      setItems((list) => [...list.slice(-8), { id, amount, x, y }]);
      setTimeout(() => setItems((list) => list.filter((f) => f.id !== id)), FEEDBACK.floatingNumberMs);
    },
  }));

  return (
    <>
      {items.map((f) => (
        <FloatingNumber key={f.id} {...f} />
      ))}
    </>
  );
});

function FloatingNumber({ amount, x, y }: Floater) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: FEEDBACK.floatingNumberMs, easing: Easing.out(Easing.cubic) });
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value * p.value,
    transform: [
      { translateX: -60 },
      { translateY: -p.value * FEEDBACK.floatingNumberRise },
      { scale: 1.15 - 0.4 * p.value },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" exiting={FadeOut} style={[styles.wrap, { left: x, top: y - 20 }, style]}>
      <Text style={styles.text}>+{formatNumber(amount)}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', width: 120, alignItems: 'center' },
  text: {
    color: COLORS.floatingNumber,
    fontSize: 26,
    fontWeight: '800',
    textShadowColor: COLORS.firefly,
    textShadowRadius: 10,
  },
});

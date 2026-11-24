import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, COMBO, FEVER } from '../config/balance';
import { currentCombo, feverReady, subscribeCombo } from '../game/comboFeed';
import { useGame } from '../game/state';
import { gameplayUnlocked } from '../game/tutorial';
import { perkEffects } from '../game/zoneMechanics';
import { t } from '../i18n';

/** Hızlı seri toplamada "×N" göstergesi; combo bitince söner. */
export function ComboCounter() {
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(true);
  const unlocked = useGame((s) => gameplayUnlocked(s.tutorialStep));
  const feverAt = useGame((s) => Math.round(FEVER.comboThreshold * perkEffects(s.perks).feverThresholdMult));
  const pop = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = subscribeCombo((c) => {
      if (c >= COMBO.minShow) {
        setCount(c);
        setReady(feverReady());
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
    <Animated.View pointerEvents="none" style={[styles.wrap, { top: insets.top + 172 }, style]}>
      <Text style={styles.text}>{unlocked && ready ? `×${count} / ${feverAt}` : `×${count}`}</Text>
      {/* Combo Fever'ın nasıl açıldığı: seri hedefi ya da bekleme. */}
      {unlocked ? <Text style={styles.hint}>{ready ? t('combo.toFever', { n: feverAt }) : t('combo.resting')}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  hint: { color: COLORS.hudSubText, fontSize: 11, fontWeight: '700', marginTop: -2 },
  text: {
    color: COLORS.firefly,
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: COLORS.firefly,
    textShadowRadius: 14,
    fontVariant: ['tabular-nums'],
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { COLORS, DEV } from '../config/balance';
import { useGame } from '../game/state';

/**
 * Geliştirme ve test build'lerinde gösterilen FPS sayacı. Dokununca stres testi:
 * ekrandaki böcek sayısı sırayla 500 / 1000 / 1500 / normal olur.
 * Kareler UI thread'de sayılır; React state saniyede en fazla birkaç kez güncellenir.
 */
export function FpsOverlay() {
  const insets = useSafeAreaInsets();
  const [fps, setFps] = useState(0);
  const active = useGame((s) => s.activeFireflies);
  const stress = useGame((s) => s.stressFireflies);
  const setStress = useGame((s) => s.setStressFireflies);
  const nextStress = () => {
    const levels: readonly number[] = DEV.stressLevels;
    const i = levels.indexOf(stress);
    setStress(levels[(i + 1) % levels.length] ?? 0);
  };
  const frames = useSharedValue(0);
  const windowStart = useSharedValue(0);

  useFrameCallback((info) => {
    'worklet';
    if (windowStart.value === 0) windowStart.value = info.timestamp;
    frames.value += 1;
    const elapsed = info.timestamp - windowStart.value;
    if (elapsed >= DEV.fpsOverlayUpdateMs) {
      scheduleOnRN(setFps, Math.round((frames.value * 1000) / elapsed));
      frames.value = 0;
      windowStart.value = info.timestamp;
    }
  });

  return (
    <Pressable onPress={nextStress} hitSlop={12} style={[styles.box, { top: insets.top + 4 }]} accessibilityRole="button">
      <Text style={styles.text}>
        {fps} FPS · {active} 🪲{stress > 0 ? ` · test ${stress}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  text: { color: COLORS.debugText, fontSize: 12, fontVariant: ['tabular-nums'] },
});

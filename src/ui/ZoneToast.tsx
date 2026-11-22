import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, UI } from '../config/balance';
import { useGame } from '../game/state';
import { t, type I18nKey } from '../i18n';

/** "Yeni bölge açıldı" bildirimi. Dokununca o bölgeye geçer. */
export function ZoneToast({ zone, onDone }: { zone: number; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const setZone = useGame((s) => s.setZone);

  useEffect(() => {
    const id = setTimeout(onDone, UI.zoneToastMs);
    return () => clearTimeout(id);
  }, [zone, onDone]);

  return (
    <Animated.View
      entering={ZoomIn.springify()}
      exiting={FadeOut}
      style={[styles.wrap, { top: insets.top + 150 }]}
    >
      <Pressable
        onPress={() => {
          setZone(zone);
          onDone();
        }}
        style={styles.card}
        accessibilityRole="button"
      >
        <Text style={styles.title}>{t('zone.unlocked')}</Text>
        <Text style={styles.name}>{t(`zone.${zone + 1}` as I18nKey)} ›</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center' },
  card: {
    minHeight: UI.minTouch,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  title: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  name: { color: COLORS.hudText, fontSize: 20, fontWeight: '800', marginTop: 2 },
});

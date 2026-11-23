import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, MOON_CYCLES } from '../../config/balance';
import { moonRules } from '../../game/moonCycle';
import { useGame } from '../../game/state';
import { t, type I18nKey } from '../../i18n';

/** Ayın adı (Tutulma katmanıyla). */
export function moonName(cycle: number): string {
  const r = moonRules(cycle);
  return r.layer > 0 ? t('moon.eclipseN', { n: r.layer }) : t(`moon.${r.id}` as I18nKey);
}

/** Ay Döngüsü: sahneye ayın rengini verir ve sağ üstte ayın adını gösterir. */
export function MoonCycle() {
  const insets = useSafeAreaInsets();
  const cycle = useGame((s) => s.moonCycle);
  if (cycle <= 0) return null;
  const r = moonRules(cycle);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: r.tint, opacity: MOON_CYCLES.tintOpacity }]} />
      <View style={[styles.pill, { top: insets.top + 58, borderColor: r.tint }]}>
        <View style={[styles.dot, { backgroundColor: r.tint }]} />
        <Text style={[styles.text, { color: r.tint }]}>{moonName(cycle)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: COLORS.panelBg,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { fontSize: 12, fontWeight: '800' },
});

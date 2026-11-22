import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, START } from '../config/balance';
import { formatNumber } from '../game/numbers';
import { useGame } from '../game/state';
import { t, type I18nKey } from '../i18n';

/** Üst bilgi: büyük Işık sayacı, kavanoz doluluğu, bölge adı. */
export function Hud() {
  const insets = useSafeAreaInsets();
  const light = useGame((s) => s.light);
  const jarCount = useGame((s) => s.jarCount);
  const zoneIndex = useGame((s) => s.zoneIndex);

  return (
    <View pointerEvents="none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.zone}>{t(`zone.${zoneIndex + 1}` as I18nKey)}</Text>
      <Text style={styles.light} accessibilityRole="text">
        {formatNumber(light)}
      </Text>
      <Text style={styles.sub}>
        {t('hud.perJar', { count: jarCount, capacity: START.jarCapacity })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  zone: { color: COLORS.hudSubText, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },
  light: {
    color: COLORS.hudText,
    fontSize: 44,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textShadowColor: COLORS.firefly,
    textShadowRadius: 12,
  },
  sub: { color: COLORS.hudSubText, fontSize: 14, fontVariant: ['tabular-nums'] },
});

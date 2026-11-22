import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, UI, ZONES } from '../config/balance';
import { unlockedZoneCount } from '../game/economy';
import { formatNumber } from '../game/numbers';
import { lightPerSecond, useGame, useStats } from '../game/state';
import { t, type I18nKey } from '../i18n';

/** Işık/sn göstergesi: saniyede bir yeniden hesaplanır. */
function useLightPerSecond(): number {
  const [rate, setRate] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRate(lightPerSecond(useGame.getState(), Date.now())), 1000);
    return () => clearInterval(id);
  }, []);
  return rate;
}

/** Üst bilgi: bölge adı ve okları, büyük Işık sayacı, Işık/sn, kavanoz doluluğu. */
export function Hud() {
  const insets = useSafeAreaInsets();
  const light = useGame((s) => s.light);
  const jarCount = useGame((s) => s.jarCount);
  const zoneIndex = useGame((s) => s.zoneIndex);
  const runLight = useGame((s) => s.runLight);
  const setZone = useGame((s) => s.setZone);
  const stats = useStats();
  const rate = useLightPerSecond();

  const unlocked = unlockedZoneCount(runLight);
  const hasPrev = zoneIndex > 0;
  const next = ZONES[zoneIndex + 1];
  const nextOpen = zoneIndex + 1 < unlocked;

  return (
    <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 6 }]}>
      <View style={styles.zoneRow}>
        <Pressable
          onPress={() => setZone(zoneIndex - 1)}
          disabled={!hasPrev}
          style={[styles.arrow, !hasPrev && styles.hidden]}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.prevZone')}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.zone}>{t(`zone.${zoneIndex + 1}` as I18nKey)}</Text>
        <Pressable
          onPress={() => setZone(zoneIndex + 1)}
          disabled={!next || !nextOpen}
          style={[styles.arrow, !next && styles.hidden, next && !nextOpen && styles.lockedArrow]}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.nextZone')}
        >
          <Text style={styles.arrowText}>{next && !nextOpen ? '🔒' : '›'}</Text>
        </Pressable>
      </View>
      {next && !nextOpen ? (
        <Text style={styles.lockHint}>{t('ui.locked', { amount: formatNumber(next.unlockAt) })}</Text>
      ) : null}
      <View pointerEvents="none" style={styles.center}>
        <Text style={styles.light} accessibilityRole="text">
          {formatNumber(light)}
        </Text>
        <Text style={styles.sub}>
          {t('hud.perSecond', { value: formatNumber(rate) })}
          {'   ·   '}
          {t('hud.perJar', { count: jarCount, capacity: stats.jarCapacity })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrow: { width: UI.minTouch, height: UI.minTouch, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: COLORS.hudText, fontSize: 24 },
  hidden: { opacity: 0 },
  lockedArrow: { opacity: 0.6 },
  lockHint: { color: COLORS.hudSubText, fontSize: 11, marginTop: -8 },
  center: { alignItems: 'center' },
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

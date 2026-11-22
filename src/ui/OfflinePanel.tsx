import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { COLORS, UI } from '../config/balance';
import { formatNumber } from '../game/numbers';
import { useGame } from '../game/state';
import { t } from '../i18n';
import { adsAllowed } from '../game/monetization';
import { showRewarded, useRewardedReady } from '../services/ads';
import { useAdOffer } from './useAdOffer';
import { hapticJarEmpty } from '../services/haptics';

/** Açılışta "Sen yokken 12.4K Işık toplandı" paneli. */
export function OfflinePanel() {
  const report = useGame((s) => s.offlineReport);
  const claim = useGame((s) => s.claimOffline);
  const ready = useRewardedReady();
  const allowed = useGame((s) => adsAllowed(s.playTimeSec));
  const removeAds = useGame((s) => s.purchases.removeAds);
  const offer = !!report && ready && allowed && !removeAds;
  useAdOffer('offline_double', offer);
  if (!report) return null;

  const collect = (mult: number) => {
    claim(mult);
    hapticJarEmpty();
  };

  const watchAd = async () => {
    const ok = await showRewarded('offline_double');
    collect(ok ? 2 : 1);
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <Animated.View entering={ZoomIn.springify()} style={styles.card}>
        <Text style={styles.title}>{t('offline.title')}</Text>
        <Text style={styles.amount}>{formatNumber(report.gain)}</Text>
        <Text style={styles.body}>{t('offline.body', { amount: formatNumber(report.gain) })}</Text>
        <View style={styles.buttons}>
          {/* "Reklamları Kaldır" sahipleri ×2'yi reklamsız alır. */}
          <Pressable style={styles.button} onPress={() => collect(removeAds ? 2 : 1)} accessibilityRole="button">
            <Text style={styles.buttonText}>{removeAds ? t('offline.collectDouble') : t('offline.collect')}</Text>
          </Pressable>
          {offer ? (
            <Pressable style={[styles.button, styles.adButton]} onPress={watchAd} accessibilityRole="button">
              <Text style={styles.buttonText}>{t('offline.double')}</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '82%',
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    padding: 22,
    alignItems: 'center',
    gap: 6,
  },
  title: { color: COLORS.hudSubText, fontSize: 15, letterSpacing: 1 },
  amount: {
    color: COLORS.hudText,
    fontSize: 40,
    fontWeight: '800',
    textShadowColor: COLORS.firefly,
    textShadowRadius: 14,
  },
  body: { color: COLORS.hudSubText, fontSize: 14, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: {
    minHeight: UI.minTouch,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adButton: { backgroundColor: COLORS.stardust },
  buttonText: { color: COLORS.accentText, fontWeight: '800', fontSize: 15 },
});

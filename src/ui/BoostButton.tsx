import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, MONETIZATION, UI } from '../config/balance';
import { adsAllowed } from '../game/monetization';
import { useGame } from '../game/state';
import { TUTORIAL_STEP } from '../game/tutorial';
import { t } from '../i18n';
import { showRewarded, useRewardedReady } from '../services/ads';
import { hapticSuccess } from '../services/haptics';
import { UI_ICONS } from './icons';
import { useAdOffer } from './useAdOffer';

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Sağ üstte "▶ ×2 Işık" ödüllü teklifi; etkinken kalan süreyi gösterir. */
export function BoostButton() {
  const insets = useSafeAreaInsets();
  const boostUntil = useGame((s) => s.boostUntil);
  const startBoost = useGame((s) => s.startBoost);
  const done = useGame((s) => s.tutorialStep >= TUTORIAL_STEP.done);
  const allowed = useGame((s) => adsAllowed(s.playTimeSec));
  const ready = useRewardedReady();
  const removeAds = useGame((s) => s.purchases.removeAds);
  const [busy, setBusy] = useState(false);
  const now = useNow(true);
  const active = now < boostUntil;
  const offer = done && allowed && ready && !active && !removeAds;
  useAdOffer('boost', offer);

  if (!done || !allowed || (!ready && !active)) return null;

  const onPress = async () => {
    if (active || busy) return;
    setBusy(true);
    const ok = await showRewarded('boost');
    setBusy(false);
    if (ok) {
      startBoost(Date.now());
      hapticSuccess();
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={active || busy}
      style={[styles.pill, { top: insets.top + 50 }, active && styles.active]}
      accessibilityRole="button"
      accessibilityLabel={t('boost.a11y', { mult: MONETIZATION.boostMultiplier })}
    >
      <Image source={UI_ICONS.boost} style={styles.icon} />
      <Text style={[styles.text, active && styles.activeText]}>
        {active
          ? t('boost.active', { mult: MONETIZATION.boostMultiplier, time: mmss(boostUntil - now) })
          : t('boost.offer', { mult: MONETIZATION.boostMultiplier })}
      </Text>
      {!active && !removeAds ? <Image source={UI_ICONS.ad} style={styles.icon} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 10,
    minHeight: UI.minTouch,
    paddingHorizontal: 10,
    borderRadius: UI.minTouch / 2,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: COLORS.accent },
  icon: { width: 24, height: 24 },
  text: { color: COLORS.accent, fontWeight: '800', fontSize: 14 },
  activeText: { color: COLORS.accentText, fontVariant: ['tabular-nums'] },
});

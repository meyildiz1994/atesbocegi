import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { COLORS, GOLDEN, UI } from '../config/balance';
import { gardenEffects } from '../game/meta';
import { adsAllowed, goldenFreeReward, goldenReward, nextGoldenAt } from '../game/monetization';
import { formatNumber } from '../game/numbers';
import { lightPerSecond, statsOf, useGame } from '../game/state';
import { TUTORIAL_STEP } from '../game/tutorial';
import { t } from '../i18n';
import { track } from '../services/analytics';
import { showRewarded, useRewardedReady } from '../services/ads';
import { hapticSuccess } from '../services/haptics';
import { UI_ICONS } from './icons';
import { useAdOffer } from './useAdOffer';
import { SoftGlow } from './SoftGlow';

const CHECK_MS = 1000;
/** Ekranın üst ve alt kısmında (HUD ve kavanoz) uçmasın. */
const Y_MIN = 0.22;
const Y_RANGE = 0.4;
const WAVE_AMPLITUDE = 40;
const WAVES = 2.5;

type Reward = { full: number; free: number };

/** Ara sıra ekranda süzülen Altın Ateşböceği; dokununca ödül kartı açılır. */
export function GoldenFirefly() {
  const { width, height } = useWindowDimensions();
  const done = useGame((s) => s.tutorialStep >= TUTORIAL_STEP.tour);
  const [flying, setFlying] = useState<{ y: number; leftToRight: boolean } | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const nextAt = useRef(0);

  useEffect(() => {
    if (!done) return;
    if (nextAt.current === 0) nextAt.current = nextGoldenAt(Date.now(), Math.random(), gardenEffects(useGame.getState().garden).golden);
    const id = setInterval(() => {
      const s = useGame.getState();
      if (flying || reward || s.offlineReport || Date.now() < nextAt.current) return;
      setFlying({ y: height * (Y_MIN + Math.random() * Y_RANGE), leftToRight: Math.random() < 0.5 });
    }, CHECK_MS);
    return () => clearInterval(id);
  }, [done, flying, reward, height]);

  const finishFlight = useCallback(() => {
    setFlying(null);
    nextAt.current = nextGoldenAt(Date.now(), Math.random(), gardenEffects(useGame.getState().garden).golden);
  }, []);

  const onCatch = () => {
    const s = useGame.getState();
    const full = goldenReward(lightPerSecond(s, Date.now()), statsOf(s));
    finishFlight();
    hapticSuccess();
    track('golden_caught', {});
    setReward({ full, free: goldenFreeReward(full) });
  };

  return (
    <>
      {flying ? (
        <Flight width={width} {...flying} onCatch={onCatch} onGone={finishFlight} />
      ) : null}
      {reward ? <RewardCard reward={reward} onDone={() => setReward(null)} /> : null}
    </>
  );
}

function Flight({
  width,
  y,
  leftToRight,
  onCatch,
  onGone,
}: {
  width: number;
  y: number;
  leftToRight: boolean;
  onCatch: () => void;
  onGone: () => void;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: GOLDEN.visibleSec * 1000, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onGone)();
    });
  }, [p, onGone]);

  const span = width + GOLDEN.size * 4;
  const style = useAnimatedStyle(() => {
    const k = leftToRight ? p.value : 1 - p.value;
    return {
      transform: [
        { translateX: k * span - GOLDEN.size * 2 },
        { translateY: y + Math.sin(p.value * Math.PI * 2 * WAVES) * WAVE_AMPLITUDE },
      ],
      opacity: 0.75 + 0.25 * Math.sin(p.value * Math.PI * 2 * WAVES * 3),
    };
  });

  return (
    <Animated.View style={[styles.flight, style]} pointerEvents="box-none">
      <Pressable
        onPress={onCatch}
        hitSlop={UI.minTouch / 2}
        accessibilityRole="button"
        accessibilityLabel={t('golden.a11y')}
        style={styles.hit}
      >
        <SoftGlow size={S * 3} color={GOLDEN.color} style={{ opacity: 0.5 }} />
        <Image source={UI_ICONS.golden} style={styles.sprite} />
      </Pressable>
    </Animated.View>
  );
}

function RewardCard({ reward, onDone }: { reward: Reward; onDone: () => void }) {
  const grant = useGame((s) => s.grantLight);
  const ready = useRewardedReady();
  const allowed = useGame((s) => adsAllowed(s.playTimeSec));
  const removeAds = useGame((s) => s.purchases.removeAds);
  const offer = ready && allowed && !removeAds;
  useAdOffer('golden', offer);

  const take = (amount: number) => {
    grant(amount);
    useGame.getState().noteGolden();
    hapticSuccess();
    onDone();
  };
  const watch = async () => {
    const ok = await showRewarded('golden');
    take(ok ? reward.full : reward.free);
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <Animated.View entering={ZoomIn.springify()} style={styles.card}>
        <View style={styles.cardBug}>
          <SoftGlow size={S * 4} color={GOLDEN.color} style={{ opacity: 0.5 }} />
          <Image source={UI_ICONS.golden} style={styles.cardSprite} />
        </View>
        <Text style={styles.title}>{t('golden.title')}</Text>
        {offer ? (
          <Pressable onPress={watch} style={[styles.button, styles.adButton]} accessibilityRole="button">
            <Image source={UI_ICONS.ad} style={styles.adIcon} />
            <Text style={styles.buttonText}>{t('golden.watch', { amount: formatNumber(reward.full) })}</Text>
          </Pressable>
        ) : null}
        {/* "Reklamları Kaldır" sahipleri tam ödülü reklamsız alır. */}
        <Pressable
          onPress={() => take(removeAds ? reward.full : reward.free)}
          style={[styles.button, offer && styles.secondary]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, offer && styles.secondaryText]}>
            {t('golden.take', { amount: formatNumber(removeAds ? reward.full : reward.free) })}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const S = GOLDEN.size;
const styles = StyleSheet.create({
  flight: { position: 'absolute', left: 0, top: 0 },
  hit: { width: S * 2, height: S * 2, alignItems: 'center', justifyContent: 'center' },
  sprite: { width: S * 1.6, height: S * 1.6 },
  cardSprite: { width: S * 2.4, height: S * 2.4 },
  adIcon: { width: 24, height: 24 },
  backdrop: { backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '82%',
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GOLDEN.color,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  cardBug: { width: S * 2.6, height: S * 2.6, alignItems: 'center', justifyContent: 'center' },
  title: { color: GOLDEN.color, fontSize: 20, fontWeight: '800' },
  button: {
    alignSelf: 'stretch',
    minHeight: UI.minTouch,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  adButton: { backgroundColor: GOLDEN.color, flexDirection: 'row', gap: 6 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.panelBorder },
  buttonText: { color: COLORS.accentText, fontWeight: '800', fontSize: 15 },
  secondaryText: { color: COLORS.hudSubText },
});

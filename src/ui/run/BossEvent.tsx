import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOSS, COLORS, UI } from '../../config/balance';
import { unlockedZoneCount } from '../../game/economy';
import { formatNumber } from '../../game/numbers';
import { useGame } from '../../game/state';
import { moonRules } from '../../game/moonCycle';
import { gameplayUnlocked } from '../../game/tutorial';
import { catchRate, onCatch } from '../../game/zoneBus';
import { bossDue, bossGoal, bossReward } from '../../game/zoneMechanics';
import { t } from '../../i18n';
import { track } from '../../services/analytics';
import { hapticSuccess } from '../../services/haptics';
import { UI_ICONS } from '../icons';

type State =
  | { kind: 'offer'; goal: number; reward: number }
  | { kind: 'fight'; goal: number; reward: number; endsAt: number }
  | { kind: 'won'; reward: number }
  | { kind: 'lost' }
  | null;

const CHECK_MS = 2000;
const clock = () => Date.now();

/**
 * Bölge sonu: dev ateşböceği. Sınır bölgesinde sonraki eşiğin %60'ına gelince uyanır;
 * 60 sn içinde hedef kadar böcek yakalanırsa doyar ve büyük ödül verir.
 */
export function BossEvent() {
  const insets = useSafeAreaInsets();
  const unlocked = useGame((s) => gameplayUnlocked(s.tutorialStep));
  const [state, setState] = useState<State>(null);
  const [fed, setFed] = useState(0);
  const [now, setNow] = useState(clock);
  const retryAt = useRef(0);
  const zoneRef = useRef(0);

  // Uyanma kontrolü.
  useEffect(() => {
    if (!unlocked || state) return;
    const id = setInterval(() => {
      const s = useGame.getState();
      const frontier = unlockedZoneCount(s.runLight) - 1;
      if (s.zoneIndex !== frontier || s.offlineReport || clock() < retryAt.current) return;
      if (!bossDue(s.zoneIndex, s.runLight, s.bossDone)) return;
      zoneRef.current = s.zoneIndex;
      setState({ kind: 'offer', goal: Math.round(bossGoal(catchRate()) * moonRules(s.moonCycle).goal), reward: bossReward(s.zoneIndex) });
    }, CHECK_MS);
    return () => clearInterval(id);
  }, [unlocked, state]);

  // Savaş: yakalamaları say, süreyi izle; kazanma ve kaybetme olay anında karara bağlanır.
  const fight = state?.kind === 'fight' ? state : null;
  useEffect(() => {
    if (!fight) return;
    let count = 0;
    let over = false;
    const off = onCatch((n) => {
      if (over) return;
      count += n;
      setFed(count);
      if (count >= fight.goal) {
        over = true;
        useGame.getState().winBoss(zoneRef.current, fight.reward, BOSS.rewardTokens);
        hapticSuccess();
        track('boss_won', { zone: zoneRef.current });
        setState({ kind: 'won', reward: fight.reward });
      }
    });
    const id = setInterval(() => {
      const n = clock();
      setNow(n);
      if (!over && n >= fight.endsAt) {
        over = true;
        retryAt.current = n + BOSS.retrySec * 1000;
        track('boss_lost', { zone: zoneRef.current, fed: count, goal: fight.goal });
        setState({ kind: 'lost' });
      }
    }, 250);
    return () => {
      off();
      clearInterval(id);
    };
  }, [fight]);

  useEffect(() => {
    if (state?.kind !== 'won' && state?.kind !== 'lost') return;
    const id = setTimeout(() => setState(null), 3200);
    return () => clearTimeout(id);
  }, [state]);

  // Zone değişirse teklif kapanır.
  const zoneIndex = useGame((s) => s.zoneIndex);
  useEffect(() => {
    if (zoneIndex !== zoneRef.current) setState((st) => (st?.kind === 'offer' || st?.kind === 'fight' ? null : st));
  }, [zoneIndex]);

  if (!state) return null;

  if (state.kind === 'offer') {
    return (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Animated.View entering={ZoomIn.springify()} style={styles.card}>
          <GiantFirefly size={110} />
          <Text style={styles.title}>{t('boss.title')}</Text>
          <Text style={styles.body}>
            {t('boss.body', {
              goal: state.goal,
              sec: BOSS.durationSec,
              reward: formatNumber(state.reward),
              tokens: BOSS.rewardTokens,
            })}
          </Text>
          <Pressable
            onPress={() => {
              setFed(0);
              setNow(clock());
              track('boss_started', { zone: zoneRef.current });
              setState({ ...state, kind: 'fight', endsAt: clock() + BOSS.durationSec * 1000 });
            }}
            style={styles.button}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t('boss.start')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              retryAt.current = clock() + BOSS.retrySec * 1000;
              setState(null);
            }}
            style={[styles.button, styles.secondary]}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, styles.secondaryText]}>{t('boss.later')}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }

  if (state.kind === 'fight') {
    const left = Math.max(0, Math.ceil((state.endsAt - now) / 1000));
    const pct = Math.min(1, fed / state.goal);
    return (
      <View pointerEvents="none" style={[styles.fight, { top: insets.top + 112 }]}>
        <GiantFirefly size={70 + 40 * pct} />
        <View style={styles.barRow}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
          </View>
          <Text style={styles.timer}>{left}s</Text>
        </View>
        <Text style={styles.progress}>{t('boss.progress', { n: Math.min(fed, state.goal), goal: state.goal })}</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} pointerEvents="none" style={[styles.result, { top: insets.top + 150 }]}>
      <View style={[styles.resultCard, state.kind === 'lost' && styles.resultLost]}>
        <Text style={styles.resultTitle}>{t(state.kind === 'won' ? 'boss.win' : 'boss.lose')}</Text>
        <Text style={styles.resultBody}>
          {state.kind === 'won'
            ? t('boss.winBody', { reward: formatNumber(state.reward), tokens: BOSS.rewardTokens })
            : t('boss.loseBody')}
        </Text>
      </View>
    </Animated.View>
  );
}

function GiantFirefly({ size }: { size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [p]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -6 + 12 * p.value }, { scale: 0.96 + 0.08 * p.value }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.25 + 0.25 * p.value }));
  return (
    <Animated.View style={[{ width: size * 1.6, height: size * 1.6, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View style={[styles.halo, { width: size * 1.6, height: size * 1.6, borderRadius: size }, halo]} />
      <Image source={UI_ICONS.golden} style={{ width: size, height: size }} />
    </Animated.View>
  );
}

const GOLD = '#ffd24a';
const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '84%',
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GOLD,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  title: { color: GOLD, fontSize: 21, fontWeight: '800', textAlign: 'center' },
  body: { color: COLORS.hudText, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  button: {
    alignSelf: 'stretch',
    minHeight: UI.minTouch,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#2a1a00', fontWeight: '800', fontSize: 16 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.panelBorder },
  secondaryText: { color: COLORS.hudSubText },
  halo: { position: 'absolute', backgroundColor: GOLD },
  fight: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { width: 180, height: 12, borderRadius: 6, backgroundColor: '#0a1a1fcc', overflow: 'hidden', borderWidth: 1, borderColor: GOLD },
  barFill: { height: '100%', backgroundColor: GOLD },
  timer: { color: '#fff', fontSize: 16, fontWeight: '800', minWidth: 34 },
  progress: { color: GOLD, fontSize: 14, fontWeight: '700', marginTop: 2 },
  result: { position: 'absolute', alignSelf: 'center' },
  resultCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: 'center',
  },
  resultLost: { borderColor: COLORS.panelBorder },
  resultTitle: { color: GOLD, fontSize: 18, fontWeight: '800' },
  resultBody: { color: COLORS.hudText, fontSize: 14, marginTop: 2 },
});

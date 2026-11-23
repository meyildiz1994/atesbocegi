import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, TOWER, UI } from '../../config/balance';
import { localDay } from '../../game/meta';
import { useGame } from '../../game/state';
import { towerGoal, towerReward, towerRule, towerTriesLeft, type TowerRule } from '../../game/tower';
import { gameplayUnlocked } from '../../game/tutorial';
import { catchRate, onCatch, zoneLive } from '../../game/zoneBus';
import { t, type I18nKey } from '../../i18n';
import { track } from '../../services/analytics';
import { gameCenterAvailable, showLeaderboard, submitScore } from '../../services/gameCenter';
import { hapticSuccess } from '../../services/haptics';

type Phase =
  | { kind: 'idle' }
  | { kind: 'panel' }
  | { kind: 'fight'; floor: number; goal: number; endsAt: number }
  | { kind: 'won'; floor: number }
  | { kind: 'lost'; floor: number };

const clock = () => Date.now();
const TOWER_COLOR = '#9fb8ff';

function applyRule(rule: TowerRule | null): void {
  zoneLive.value = {
    ...zoneLive.value,
    towerOn: rule !== null,
    towerSpeed: rule === 'fast' ? TOWER.speedMult : 1,
    towerSpawn: rule === 'sparse' ? TOWER.sparseMult : 1,
    towerWind: rule === 'wind',
  };
}

/** Gece Kulesi: sağ üstte kat düğmesi, kat seçimi, 45 sn'lik meydan okuma ve sonuç. */
export function Tower() {
  const insets = useSafeAreaInsets();
  const unlocked = useGame((s) => gameplayUnlocked(s.tutorialStep) && s.bestZone >= TOWER.unlockZone);
  const floor = useGame((s) => s.towerFloor);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [fed, setFed] = useState(0);
  const [now, setNow] = useState(clock);

  const fight = phase.kind === 'fight' ? phase : null;
  useEffect(() => {
    if (!fight) return;
    applyRule(towerRule(fight.floor));
    let count = 0;
    let over = false;
    const off = onCatch((n) => {
      if (over) return;
      count += n;
      setFed(count);
      if (count >= fight.goal) {
        over = true;
        applyRule(null);
        const g = useGame.getState();
        g.towerWin(fight.floor);
        submitScore('tower', fight.floor);
        hapticSuccess();
        track('tower_won', { floor: fight.floor });
        setPhase({ kind: 'won', floor: fight.floor });
      }
    });
    const id = setInterval(() => {
      const n = clock();
      setNow(n);
      if (!over && n >= fight.endsAt) {
        over = true;
        applyRule(null);
        useGame.getState().towerFail(n);
        track('tower_lost', { floor: fight.floor, fed: count, goal: fight.goal });
        setPhase({ kind: 'lost', floor: fight.floor });
      }
    }, 250);
    return () => {
      off();
      clearInterval(id);
      applyRule(null);
    };
  }, [fight]);

  if (!unlocked) return null;

  const start = () => {
    const next = useGame.getState().towerFloor + 1;
    setFed(0);
    setNow(clock());
    track('tower_started', { floor: next });
    setPhase({ kind: 'fight', floor: next, goal: towerGoal(next, catchRate()), endsAt: clock() + TOWER.durationSec * 1000 });
  };

  if (phase.kind === 'fight') {
    const left = Math.max(0, Math.ceil((phase.endsAt - now) / 1000));
    const pct = Math.min(1, fed / phase.goal);
    return (
      <View pointerEvents="none" style={[styles.fight, { top: insets.top + 142 }]}>
        <Text style={styles.fightTitle}>
          {t('tower.floor', { n: phase.floor })} · {t(`tower.rule.${towerRule(phase.floor)}` as I18nKey)}
        </Text>
        <View style={styles.barRow}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
          </View>
          <Text style={styles.timer}>{left}s</Text>
        </View>
        <Text style={styles.progress}>{t('boss.progress', { n: Math.min(fed, phase.goal), goal: phase.goal })}</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setPhase({ kind: 'panel' })}
        style={[styles.button, { top: insets.top + 92 }]}
        accessibilityRole="button"
        accessibilityLabel={t('tower.title')}
      >
        <Text style={styles.buttonIcon}>♜</Text>
        <Text style={styles.buttonText}>{t('tower.floor', { n: floor + 1 })}</Text>
      </Pressable>
      {phase.kind === 'panel' ? <TowerPanel onStart={start} onClose={() => setPhase({ kind: 'idle' })} /> : null}
      {phase.kind === 'won' || phase.kind === 'lost' ? (
        <TowerResult phase={phase} onNext={start} onClose={() => setPhase({ kind: 'idle' })} />
      ) : null}
    </>
  );
}

function useTries(): number {
  const towerDay = useGame((s) => s.towerDay);
  const used = useGame((s) => s.towerTries);
  const bought = useGame((s) => s.towerBought);
  const [today] = useState(() => localDay(clock()));
  return towerTriesLeft(today, towerDay, used, bought);
}

function TowerPanel({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  const floor = useGame((s) => s.towerFloor) + 1;
  const tokens = useGame((s) => s.jarTokens);
  const buyTry = useGame((s) => s.towerBuyTry);
  const tries = useTries();
  const reward = towerReward(floor);
  const nextChest = Math.ceil(floor / TOWER.chestEvery) * TOWER.chestEvery;
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <Animated.View entering={ZoomIn.springify()} style={styles.card}>
        <Text style={styles.title}>{t('tower.title')}</Text>
        <Text style={styles.floorBig}>{t('tower.floor', { n: floor })}</Text>
        <Text style={styles.body}>{t(`tower.rule.${towerRule(floor)}.desc` as I18nKey, { sec: TOWER.durationSec })}</Text>
        <Text style={styles.reward}>
          {t('tower.reward', { tokens: reward.tokens })}
          {reward.stardust ? `  ${t('tower.rewardDust', { n: reward.stardust })}` : ''}
        </Text>
        <Text style={styles.sub}>{t('tower.chest', { n: nextChest })}</Text>
        <View style={styles.tries}>
          {Array.from({ length: Math.max(TOWER.dailyTries, tries) }, (_, i) => (
            <View key={i} style={[styles.tryDot, i < tries && styles.tryOn]} />
          ))}
          <Text style={styles.sub}>{t('tower.tries', { n: tries })}</Text>
        </View>
        {tries > 0 ? (
          <Pressable onPress={onStart} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>{t('tower.climb')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => buyTry(clock()) && hapticSuccess()}
            disabled={tokens < TOWER.extraTryTokens}
            style={[styles.primary, tokens < TOWER.extraTryTokens && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{t('tower.buyTry', { n: TOWER.extraTryTokens })}</Text>
          </Pressable>
        )}
        {gameCenterAvailable() ? (
          <Pressable onPress={() => void showLeaderboard('tower')} style={styles.secondary} accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: TOWER_COLOR }]}>{t('tower.leaderboard')}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onClose} style={styles.secondary} accessibilityRole="button">
          <Text style={styles.secondaryText}>{t('ui.close')}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function TowerResult({ phase, onNext, onClose }: { phase: { kind: 'won' | 'lost'; floor: number }; onNext: () => void; onClose: () => void }) {
  const tries = useTries();
  const won = phase.kind === 'won';
  const r = towerReward(phase.floor);
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <Animated.View entering={ZoomIn.springify()} style={[styles.card, !won && styles.cardLost]}>
        <Text style={styles.title}>{won ? t('tower.won', { n: phase.floor }) : t('tower.lost', { n: phase.floor })}</Text>
        <Text style={styles.body}>
          {won
            ? `${t('tower.reward', { tokens: r.tokens })}${r.stardust ? `  ${t('tower.rewardDust', { n: r.stardust })}` : ''}`
            : t('tower.lostBody', { n: tries })}
        </Text>
        {won || tries > 0 ? (
          <Pressable onPress={onNext} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>{won ? t('tower.next', { n: phase.floor + 1 }) : t('tower.retry')}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onClose} style={styles.secondary} accessibilityRole="button">
          <Text style={styles.secondaryText}>{t('ui.close')}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1,
    borderColor: TOWER_COLOR,
  },
  buttonIcon: { color: TOWER_COLOR, fontSize: 16 },
  buttonText: { color: TOWER_COLOR, fontSize: 13, fontWeight: '800' },
  backdrop: { backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '84%',
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOWER_COLOR,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  cardLost: { borderColor: COLORS.panelBorder },
  title: { color: TOWER_COLOR, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  floorBig: { color: '#fff', fontSize: 34, fontWeight: '900' },
  body: { color: COLORS.hudText, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  reward: { color: '#ffd24a', fontSize: 15, fontWeight: '800' },
  sub: { color: COLORS.hudSubText, fontSize: 12 },
  tries: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  tryDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2a3a50' },
  tryOn: { backgroundColor: TOWER_COLOR },
  primary: {
    alignSelf: 'stretch',
    minHeight: UI.minTouch,
    borderRadius: 12,
    backgroundColor: TOWER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#0a1020', fontWeight: '900', fontSize: 16 },
  secondary: { alignSelf: 'stretch', minHeight: UI.minTouch, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: COLORS.hudSubText, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  fight: { position: 'absolute', alignSelf: 'center', alignItems: 'center', gap: 4 },
  fightTitle: { color: TOWER_COLOR, fontSize: 15, fontWeight: '900' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { width: 180, height: 12, borderRadius: 6, backgroundColor: '#0a1a1fcc', overflow: 'hidden', borderWidth: 1, borderColor: TOWER_COLOR },
  barFill: { height: '100%', backgroundColor: TOWER_COLOR },
  timer: { color: '#fff', fontSize: 16, fontWeight: '800', minWidth: 34 },
  progress: { color: TOWER_COLOR, fontSize: 14, fontWeight: '700' },
});

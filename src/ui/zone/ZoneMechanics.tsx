import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, CRYSTAL, FOG, MUSHROOM, UI, WIND } from '../../config/balance';
import { formatNumber } from '../../game/numbers';
import { lightPerSecond, useGame, useStats } from '../../game/state';
import { gameplayUnlocked } from '../../game/tutorial';
import { onCatch, onGust, zoneLive } from '../../game/zoneBus';
import { crystalGoal, windReward } from '../../game/zoneMechanics';
import { t, type I18nKey } from '../../i18n';
import { track } from '../../services/analytics';
import { hapticSuccess } from '../../services/haptics';
import { Mushrooms } from './Mushrooms';

const MECHANIC_ZONES: number[] = [FOG.zoneIndex, MUSHROOM.zoneIndex, CRYSTAL.zoneIndex, WIND.zoneIndex];

/** Bulunulan bölgenin mekaniği (arayüz kısmı) ve ilk girişte tanıtım kartı. */
export function ZoneMechanics() {
  const zoneIndex = useGame((s) => s.zoneIndex);
  const unlocked = useGame((s) => gameplayUnlocked(s.tutorialStep));
  const seen = useGame((s) => s.hintsSeen.includes(s.zoneIndex));
  if (!unlocked) return null;
  return (
    <>
      {zoneIndex === MUSHROOM.zoneIndex ? <Mushrooms /> : null}
      {zoneIndex === CRYSTAL.zoneIndex ? <Crystals /> : null}
      {zoneIndex === WIND.zoneIndex ? <WindRewards /> : null}
      {MECHANIC_ZONES.includes(zoneIndex) && !seen ? <MechanicHint zoneIndex={zoneIndex} /> : null}
    </>
  );
}

function MechanicHint({ zoneIndex }: { zoneIndex: number }) {
  const mark = useGame((s) => s.markHint);
  return (
    <Animated.View entering={FadeIn.delay(600)} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <Animated.View entering={ZoomIn.springify().delay(600)} style={styles.card}>
        <Text style={styles.title}>{t(`hint.${zoneIndex}.title` as I18nKey)}</Text>
        <Text style={styles.body}>{t(`hint.${zoneIndex}.body` as I18nKey)}</Text>
        <Pressable onPress={() => mark(zoneIndex)} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>{t('hint.ok')}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

/** Kristal Mağara: renkli böceklerle dolan üç kristal; üçü dolunca rezonans. */
function Crystals() {
  const insets = useSafeAreaInsets();
  const stats = useStats();
  const goal = crystalGoal(stats.jarCapacity);
  const [charge, setCharge] = useState([0, 0, 0]);
  const [scarce, setScarce] = useState(() => Math.floor(Math.random() * 3));
  const [toast, setToast] = useState<string | null>(null);
  const goalRef = useRef(goal);
  const valueRef = useRef(0);
  useEffect(() => {
    goalRef.current = goal;
    valueRef.current = stats.jarCapacity * stats.valuePerFirefly;
  }, [goal, stats]);

  useEffect(() => {
    zoneLive.value = { ...zoneLive.value, scarce };
  }, [scarce]);

  useEffect(
    () =>
      onCatch((_, kinds) => {
        if (!(kinds[1]! + kinds[2]! + kinds[3]!)) return;
        setCharge((c) => {
          const g = goalRef.current;
          const next = c.map((v, k) => Math.min(g, v + (kinds[k + 1] ?? 0)));
          if (next.every((v) => v >= g)) {
            const s = useGame.getState();
            s.startResonance(Date.now());
            const reward = CRYSTAL.rewardJars * valueRef.current;
            s.grantLight(reward);
            hapticSuccess();
            track('crystal_resonance', {});
            setToast(`${t('crystal.resonance')}  +${formatNumber(reward)}`);
            setScarce((x) => (x + 1 + Math.floor(Math.random() * 2)) % 3);
            return [0, 0, 0];
          }
          return next;
        });
      }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <>
      <View pointerEvents="none" style={[styles.crystals, { top: insets.top + 118 }]}>
        {CRYSTAL.colors.map((color, k) => (
          <Crystal key={k} color={color} fill={charge[k]! / goal} scarce={k === scarce} />
        ))}
      </View>
      {toast ? <Toast text={toast} top={insets.top + 210} color={CRYSTAL.colors[1]} /> : null}
    </>
  );
}

function Crystal({ color, fill, scarce }: { color: string; fill: number; scarce: boolean }) {
  const full = fill >= 1;
  return (
    <View style={styles.crystalWrap}>
      <View style={[styles.crystal, { borderColor: color }, full && { shadowColor: color, shadowOpacity: 1 }]}>
        <View style={[styles.crystalFill, { backgroundColor: color, height: `${Math.round(fill * 100)}%` }]} />
      </View>
      {scarce ? <Text style={[styles.scarce, { color }]}>!</Text> : null}
    </View>
  );
}

/** Gök Kanyonu: rüzgâr böceği yakalanınca ödül; rüzgâr gelince kısa bir uyarı. */
function WindRewards() {
  const insets = useSafeAreaInsets();
  const stats = useStats();
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const valueRef = useRef(0);
  useEffect(() => {
    valueRef.current = stats.jarCapacity * stats.valuePerFirefly;
  }, [stats]);

  useEffect(() => {
    const offCatch = onCatch((_, kinds) => {
      const n = kinds[4] ?? 0;
      if (n <= 0) return;
      const s = useGame.getState();
      const reward = windReward(lightPerSecond(s, Date.now()), valueRef.current) * n;
      s.grantLight(reward);
      hapticSuccess();
      setToast((p) => ({ text: `${t('wind.caught')}  +${formatNumber(reward)}`, n: (p?.n ?? 0) + 1 }));
    });
    const offGust = onGust(() => setToast((p) => ({ text: t('wind.gust'), n: (p?.n ?? 0) + 1 })));
    return () => {
      offCatch();
      offGust();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  return toast ? <Toast key={toast.n} text={toast.text} top={insets.top + 210} color={WIND.color} /> : null;
}

function Toast({ text, top, color }: { text: string; top: number; color: string }) {
  return (
    <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} pointerEvents="none" style={[styles.toastWrap, { top }]}>
      <View style={[styles.toast, { borderColor: color, shadowColor: color }]}>
        <Text style={[styles.toastText, { color }]}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '84%',
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 22,
    gap: 12,
  },
  title: { color: COLORS.accent, fontSize: 21, fontWeight: '800', textAlign: 'center' },
  body: { color: COLORS.hudText, fontSize: 15, lineHeight: 21 },
  button: {
    minHeight: UI.minTouch,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: COLORS.accentText, fontWeight: '800', fontSize: 16 },
  crystals: { position: 'absolute', left: 14, gap: 10 },
  crystalWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crystal: {
    width: 26,
    height: 40,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: '#0a0f1acc',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    transform: [{ skewY: '-8deg' }],
    shadowRadius: 12,
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  crystalFill: { width: '100%', opacity: 0.85 },
  scarce: { fontSize: 16, fontWeight: '900' },
  toastWrap: { position: 'absolute', alignSelf: 'center' },
  toast: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1,
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  toastText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
});

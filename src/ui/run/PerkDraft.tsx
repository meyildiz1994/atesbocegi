import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { COLORS, PERKS, UI, type PerkBranch } from '../../config/balance';
import { useGame } from '../../game/state';
import { gameplayUnlocked } from '../../game/tutorial';
import { perkChoices, perkOfferAt } from '../../game/zoneMechanics';
import { t, type I18nKey } from '../../i18n';
import { track } from '../../services/analytics';
import { hapticSuccess } from '../../services/haptics';

/** "Yükseltme kartları" tanıtımı hintsSeen'de bu numarayla tutulur. */
export const PERK_HINT = 50;

const BRANCH_COLOR: Record<PerkBranch, string> = {
  pull: '#7fd6ff',
  jar: '#ffc94a',
  spirit: '#c8a8ff',
  combo: '#ff8a5a',
  glow: '#e8ff9a',
  luck: '#7dffb0',
};

const frac = (x: number) => {
  const v = Math.sin(x + 1) * 43758.5453;
  return v - Math.floor(v);
};

/** Yeni yetenek açan basamaklar. */
function unlocksAt(b: PerkBranch, tier: number): boolean {
  if (b === 'spirit') return tier === PERKS.spirit.bonusSpiritAt;
  if (b === 'combo') return tier === PERKS.combo.autoFeverAt;
  return false;
}

/**
 * Seçimli yükseltmeler: her birkaç dolu kavanozda iki kart çıkar, oyuncu birini seçer.
 * Seçilen dalın sonraki kartı daha güçlüdür; bazı basamaklar yeni yetenek açar.
 */
export function PerkDraft() {
  const due = useGame((s) => gameplayUnlocked(s.tutorialStep) && s.runJars >= perkOfferAt(s.perksTaken) && !s.offlineReport);
  const taken = useGame((s) => s.perksTaken);
  const perks = useGame((s) => s.perks);
  const showIntro = useGame((s) => !s.hintsSeen.includes(PERK_HINT));
  const dawns = useGame((s) => s.prestigeCount);
  // Teklif, kart sayısı değişene kadar sabit kalır (kart sayısı ve Şafak sayısından türeyen rastgelelik).
  const choices = useMemo(() => perkChoices(perks, frac(taken * 12.9898 + dawns * 4.1414), frac(taken * 78.233 + dawns * 1.618)), [perks, taken, dawns]);
  if (!due || choices.length === 0) return null;

  const pick = (b: PerkBranch) => {
    const s = useGame.getState();
    s.takePerk(b);
    if (showIntro) s.markHint(PERK_HINT);
    hapticSuccess();
    track('perk_taken', { branch: b, tier: s.perks[b] + 1 });
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
      {showIntro ? (
        <Animated.View entering={FadeInDown.delay(150)} style={styles.intro}>
          <Text style={styles.introTitle}>{t('perk.introTitle')}</Text>
          <Text style={styles.introBody}>{t('perk.introBody')}</Text>
        </Animated.View>
      ) : (
        <Text style={styles.heading}>{t('perk.title')}</Text>
      )}
      <View style={styles.row}>
        {choices.map((b, k) => {
          const tier = perks[b] + 1;
          const color = BRANCH_COLOR[b];
          return (
            <Animated.View key={b} entering={FadeInDown.delay(250 + k * 120).springify()} style={styles.cardWrap}>
              <Pressable
                onPress={() => pick(b)}
                style={({ pressed }) => [styles.card, { borderColor: color, shadowColor: color }, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={[styles.branch, { color }]}>{t(`perk.${b}.name` as I18nKey)}</Text>
                <View style={styles.dots}>
                  {Array.from({ length: PERKS[b].maxTier }, (_, i) => (
                    <View key={i} style={[styles.dot, i < tier && { backgroundColor: color }]} />
                  ))}
                </View>
                <Text style={styles.desc}>{t(`perk.${b}.desc` as I18nKey)}</Text>
                {unlocksAt(b, tier) ? (
                  <Text style={[styles.unlock, { color }]}>{t(`perk.${b}.unlock` as I18nKey)}</Text>
                ) : null}
                <View style={[styles.choose, { backgroundColor: color }]}>
                  <Text style={styles.chooseText}>{t('perk.choose')}</Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000000b8', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 18 },
  heading: { color: COLORS.hudText, fontSize: 22, fontWeight: '800' },
  intro: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 16,
    gap: 6,
    width: '100%',
  },
  introTitle: { color: COLORS.accent, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  introBody: { color: COLORS.hudText, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12, width: '100%' },
  cardWrap: { flex: 1 },
  card: {
    flex: 1,
    minHeight: 230,
    backgroundColor: COLORS.panelBg,
    borderRadius: 18,
    borderWidth: 2,
    padding: 14,
    alignItems: 'center',
    gap: 10,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  pressed: { transform: [{ scale: 0.96 }] },
  branch: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff22' },
  desc: { color: COLORS.hudText, fontSize: 14, textAlign: 'center', lineHeight: 19, flex: 1 },
  unlock: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  choose: {
    alignSelf: 'stretch',
    minHeight: UI.minTouch,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseText: { color: '#141414', fontWeight: '900', fontSize: 15 },
});

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS, PRESTIGE, SKILL_ORDER, SKILLS, UI, type SkillId } from '../config/balance';
import { canBuySkill, canPrestige, globalMultiplier, stardustForPrestige } from '../game/economy';
import { formatNumber } from '../game/numbers';
import { useGame } from '../game/state';
import { t, type I18nKey } from '../i18n';
import { hapticSuccess } from '../services/haptics';
import { Sheet } from './Sheet';

/** Prestij (Şafak) paneli ve Yıldız Tozu yetenek ağacı. */
export function DawnPanel({ onClose }: { onClose: () => void }) {
  const runLight = useGame((s) => s.runLight);
  const stardust = useGame((s) => s.stardust);
  const stardustEarned = useGame((s) => s.stardustEarned);
  const prestige = useGame((s) => s.prestige);

  const ready = canPrestige(runLight);
  const gain = stardustForPrestige(runLight);

  const onDawn = () => {
    if (prestige() > 0) {
      hapticSuccess();
      onClose();
    }
  };

  return (
    <Sheet title={t('dawn.title')} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.stats}>
          <Text style={styles.stardust}>{t('dawn.stardust', { amount: formatNumber(stardust) })}</Text>
          <Text style={styles.bonus}>
            {t('dawn.bonus', { mult: globalMultiplier(stardustEarned).toFixed(1) })}
          </Text>
        </View>
        <Text style={styles.explain}>
          {ready ? t('dawn.explain') : t('dawn.notYet', { amount: formatNumber(PRESTIGE.unlockAt) })}
        </Text>
        <Pressable
          onPress={onDawn}
          disabled={!ready}
          style={[styles.dawnButton, !ready && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
        >
          <Text style={styles.dawnText}>{t('dawn.button')}</Text>
          {ready ? <Text style={styles.dawnGain}>{t('dawn.gain', { amount: gain })}</Text> : null}
        </Pressable>

        <Text style={styles.section}>{t('dawn.skills')}</Text>
        {SKILL_ORDER.map((id) => (
          <SkillRow key={id} id={id} />
        ))}
      </ScrollView>
    </Sheet>
  );
}

function SkillRow({ id }: { id: SkillId }) {
  const owned = useGame((s) => s.skills[id]);
  const skills = useGame((s) => s.skills);
  const stardust = useGame((s) => s.stardust);
  const buy = useGame((s) => s.buySkill);
  const def = SKILLS[id];
  const available = canBuySkill(id, skills, stardust);
  const locked = !!def.requires && !skills[def.requires as SkillId];

  return (
    <View style={[styles.skill, owned && styles.skillOwned, locked && styles.skillLocked]}>
      <View style={styles.skillInfo}>
        <Text style={styles.skillName}>{t(`skill.${id}.name` as I18nKey)}</Text>
        <Text style={styles.skillDesc}>{t(`skill.${id}.desc` as I18nKey)}</Text>
      </View>
      <Pressable
        onPress={() => {
          if (buy(id)) hapticSuccess();
        }}
        disabled={!available}
        style={[styles.skillBuy, !available && styles.disabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !available }}
      >
        <Text style={styles.skillBuyText}>{owned ? '✓' : t('skill.cost', { cost: def.cost })}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stardust: { color: COLORS.stardust, fontSize: 16, fontWeight: '700' },
  bonus: { color: COLORS.hudSubText, fontSize: 15 },
  explain: { color: COLORS.hudSubText, fontSize: 14 },
  dawnButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.dawn,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dawnText: { color: '#2a1a00', fontSize: 18, fontWeight: '800' },
  dawnGain: { color: '#5a3a00', fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.35 },
  section: { color: COLORS.hudText, fontSize: 16, fontWeight: '700', marginTop: 8 },
  skill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  skillOwned: { borderColor: COLORS.stardust },
  skillLocked: { opacity: 0.5 },
  skillInfo: { flex: 1, paddingRight: 8 },
  skillName: { color: COLORS.hudText, fontSize: 15, fontWeight: '700' },
  skillDesc: { color: COLORS.hudSubText, fontSize: 12, marginTop: 2 },
  skillBuy: {
    minWidth: 64,
    minHeight: UI.minTouch,
    borderRadius: 10,
    backgroundColor: COLORS.stardust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillBuyText: { color: '#1a1030', fontWeight: '800' },
});

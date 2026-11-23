import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import {
  COLORS,
  MOON_CYCLES,
  PRESTIGE,
  SKILL_ORDER,
  SKILLS,
  STAR_UPGRADE_ORDER,
  UI,
  type SkillId,
  type StarUpgradeId,
} from '../config/balance';
import { canBuySkill, canPrestige, globalMultiplier } from '../game/economy';
import { dawnStardust, moonComplete, moonRules } from '../game/moonCycle';
import { formatNumber } from '../game/numbers';
import { useGame } from '../game/state';
import { starCost, starMaxed } from '../game/zoneMechanics';
import { t, type I18nKey } from '../i18n';
import { track } from '../services/analytics';
import { submitAll } from '../services/gameCenter';
import { hapticSuccess } from '../services/haptics';
import { moonName } from './run/MoonCycle';
import { Sheet } from './Sheet';
import { SkyMap } from './SkyMap';

/** Prestij (Şafak) paneli ve Yıldız Tozu yetenek ağacı. */
export function DawnPanel({ onClose }: { onClose: () => void }) {
  const runLight = useGame((s) => s.runLight);
  const stardust = useGame((s) => s.stardust);
  const stardustEarned = useGame((s) => s.stardustEarned);
  const prestige = useGame((s) => s.prestige);
  const cycle = useGame((s) => s.moonCycle);
  const bestZone = useGame((s) => s.bestZone);

  const ready = canPrestige(runLight);
  const gain = dawnStardust(runLight, cycle);
  const nextMoon = moonComplete(runLight);
  const showMoon = cycle > 0 || bestZone >= 4;
  const [confirming, setConfirming] = useState(false);
  const [skyOpen, setSkyOpen] = useState(false);

  const onDawn = () => {
    setConfirming(false);
    const dust = prestige();
    if (dust > 0) {
      const s = useGame.getState();
      track('prestige', {
        count: s.prestigeCount,
        stardust: dust,
        playTimeSec: Math.round(s.playTimeSec),
      });
      hapticSuccess();
      submitAll();
      onClose();
    }
  };

  return (
    <>
      <Sheet title={t('dawn.title')} onClose={onClose}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.stats}>
            <Text style={styles.stardust}>{t('dawn.stardust', { amount: formatNumber(stardust) })}</Text>
            <Text style={styles.bonus}>
              {t('dawn.bonus', {
                mult: globalMultiplier(stardustEarned).toFixed(1),
              })}
            </Text>
          </View>
          <Text style={styles.explain}>{ready ? t('dawn.explain') : t('dawn.notYet', { amount: formatNumber(PRESTIGE.unlockAt) })}</Text>
          {showMoon ? (
            <View style={styles.moon}>
              <Text style={styles.moonTitle}>{t('moon.current', { name: moonName(cycle) })}</Text>
              <View style={styles.moonBar}>
                <View
                  style={[
                    styles.moonFill,
                    {
                      width: `${Math.round(Math.min(1, runLight / MOON_CYCLES.completeAt) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.moonText}>
                {nextMoon
                  ? t('moon.ready', { name: moonName(cycle + 1) })
                  : t('moon.progress', {
                      current: formatNumber(runLight),
                      target: formatNumber(MOON_CYCLES.completeAt),
                    })}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => setConfirming(true)}
            disabled={!ready}
            style={[styles.dawnButton, !ready && styles.disabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready }}
          >
            <Text style={styles.dawnText}>{t('dawn.button')}</Text>
            {ready ? <Text style={styles.dawnGain}>{t('dawn.gain', { amount: gain })}</Text> : null}
          </Pressable>

          <Pressable onPress={() => setSkyOpen(true)} style={styles.skyButton} accessibilityRole="button">
            <Text style={styles.skyTitle}>{t('sky.open')}</Text>
            <Text style={styles.skySub}>{t('sky.openSub')}</Text>
          </Pressable>

          <Text style={styles.section}>{t('dawn.skills')}</Text>
          {SKILL_ORDER.map((id) => (
            <SkillRow key={id} id={id} />
          ))}

          <Text style={styles.section}>{t('dawn.starUpgrades')}</Text>
          {STAR_UPGRADE_ORDER.map((id) => (
            <StarRow key={id} id={id} />
          ))}
        </ScrollView>
        {confirming ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.confirmBackdrop]}>
            <Animated.View entering={ZoomIn.springify()} style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>{t('dawn.confirmTitle')}</Text>
              <ConfirmLine label={t('dawn.resets')} text={t('dawn.resetsList')} color="#ff9a8a" />
              <ConfirmLine label={t('dawn.keeps')} text={t('dawn.keepsList')} color={COLORS.accent} />
              <ConfirmLine
                label={t('dawn.gets')}
                text={t('dawn.getsList', {
                  amount: gain,
                  pct: Math.round(gain * PRESTIGE.multPerStardust * 100),
                })}
                color={COLORS.stardust}
              />
              {nextMoon ? (
                <ConfirmLine
                  color="#7fa8ff"
                  label={t('moon.next')}
                  text={t('moon.nextText', {
                    name: moonName(cycle + 1),
                    dust: moonRules(cycle + 1).dust,
                  })}
                />
              ) : null}
              <Pressable onPress={onDawn} style={styles.dawnButton} accessibilityRole="button">
                <Text style={styles.dawnText}>{t('dawn.confirm')}</Text>
              </Pressable>
              <Pressable onPress={() => setConfirming(false)} style={styles.cancel} accessibilityRole="button">
                <Text style={styles.cancelText}>{t('dawn.cancel')}</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        ) : null}
      </Sheet>
      {skyOpen ? <SkyMap onClose={() => setSkyOpen(false)} /> : null}
    </>
  );
}

function ConfirmLine({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <View style={styles.confirmLine}>
      <Text style={[styles.confirmLabel, { color }]}>{label}</Text>
      <Text style={styles.confirmText}>{text}</Text>
    </View>
  );
}

/** Sınırsız seviyelenen Yıldız yükseltmesi: maliyet her seviyede artar. */
function StarRow({ id }: { id: StarUpgradeId }) {
  const level = useGame((s) => s.starLevels[id]);
  const stardust = useGame((s) => s.stardust);
  const buy = useGame((s) => s.buyStar);
  const maxed = starMaxed(id, level);
  const cost = starCost(id, level);
  const available = !maxed && stardust >= cost;
  return (
    <View style={[styles.skill, level > 0 && styles.skillOwned]}>
      <View style={styles.skillInfo}>
        <Text style={styles.skillName}>
          {t(`star.${id}.name` as I18nKey)} <Text style={styles.level}>{t('star.level', { level })}</Text>
        </Text>
        <Text style={styles.skillDesc}>{t(`star.${id}.desc` as I18nKey)}</Text>
      </View>
      <Pressable
        onPress={() => {
          if (!buy(id)) return;
          hapticSuccess();
          track('star_upgrade', { id, level: level + 1 });
        }}
        disabled={!available}
        style={[styles.skillBuy, !available && styles.disabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !available }}
      >
        <Text style={styles.skillBuyText}>{maxed ? t('star.max') : t('skill.cost', { cost })}</Text>
      </Pressable>
    </View>
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
          if (!buy(id)) return;
          hapticSuccess();
          track('skill_purchased', { id });
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
  skyButton: {
    backgroundColor: '#14102a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.stardust,
    padding: 14,
    marginTop: 4,
  },
  skyTitle: { color: COLORS.stardust, fontSize: 16, fontWeight: '900' },
  skySub: { color: COLORS.hudSubText, fontSize: 12, marginTop: 2 },
  moon: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7fa8ff',
    padding: 12,
    gap: 6,
  },
  moonTitle: { color: '#a9c4ff', fontSize: 15, fontWeight: '800' },
  moonBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a1426',
    overflow: 'hidden',
  },
  moonFill: { height: '100%', backgroundColor: '#7fa8ff' },
  moonText: { color: COLORS.hudSubText, fontSize: 12 },
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
  section: {
    color: COLORS.hudText,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
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
  level: { color: COLORS.stardust, fontSize: 13, fontWeight: '700' },
  confirmBackdrop: {
    backgroundColor: '#000000c0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.dawn,
    padding: 20,
    gap: 12,
  },
  confirmTitle: {
    color: COLORS.dawn,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmLine: { gap: 2 },
  confirmLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  confirmText: { color: COLORS.hudText, fontSize: 15, lineHeight: 20 },
  cancel: {
    minHeight: UI.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: COLORS.hudSubText, fontSize: 15, fontWeight: '700' },
});

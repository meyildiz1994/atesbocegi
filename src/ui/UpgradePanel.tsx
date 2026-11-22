import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS, UI, UPGRADE_ORDER, UPGRADES, type UpgradeId } from '../config/balance';
import { levelsLeft, purchasePlan, type BuyMode } from '../game/economy';
import { formatNumber } from '../game/numbers';
import { useGame } from '../game/state';
import { t, type I18nKey } from '../i18n';
import { track } from '../services/analytics';
import { hapticJarEmpty } from '../services/haptics';
import { UPGRADE_ICONS } from './icons';
import { Sheet } from './Sheet';

const MODES: BuyMode[] = [1, 10, 'max'];

function modeLabel(m: BuyMode): string {
  return m === 'max' ? t('ui.max') : `×${m}`;
}

export function UpgradePanel({ onClose }: { onClose: () => void }) {
  const buyMode = useGame((s) => s.buyMode);
  const setBuyMode = useGame((s) => s.setBuyMode);

  const modes = (
    <View style={styles.modes}>
      {MODES.map((m) => (
        <Pressable
          key={String(m)}
          onPress={() => setBuyMode(m)}
          style={[styles.mode, buyMode === m && styles.modeActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: buyMode === m }}
        >
          <Text style={[styles.modeText, buyMode === m && styles.modeTextActive]}>{modeLabel(m)}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Sheet title={t('ui.upgrades')} onClose={onClose} headerRight={modes}>
      <ScrollView contentContainerStyle={styles.list}>
        {UPGRADE_ORDER.map((id) => (
          <UpgradeRow key={id} id={id} />
        ))}
      </ScrollView>
    </Sheet>
  );
}

function UpgradeRow({ id }: { id: UpgradeId }) {
  const level = useGame((s) => s.levels[id]);
  const light = useGame((s) => s.light);
  const buyMode = useGame((s) => s.buyMode);
  const buy = useGame((s) => s.buyUpgrade);

  const maxed = levelsLeft(id, level) === 0;
  const plan = purchasePlan(id, level, light, buyMode);
  const oneTime = UPGRADES[id].maxLevel === 1;

  const onPress = () => {
    if (!buy(id)) return;
    hapticJarEmpty();
    const s = useGame.getState();
    track('upgrade_purchased', { id, level: s.levels[id], playTimeSec: Math.round(s.playTimeSec) });
  };

  return (
    <View style={[styles.card, plan.affordable && !maxed && styles.cardAffordable]}>
      <Image source={UPGRADE_ICONS[id]} style={styles.icon} accessibilityIgnoresInvertColors />
      <View style={styles.info}>
        <Text style={styles.name}>{t(`upgrade.${id}.name` as I18nKey)}</Text>
        <Text style={styles.desc}>{t(`upgrade.${id}.desc` as I18nKey)}</Text>
        {!oneTime ? <Text style={styles.level}>{t('ui.level', { level })}</Text> : null}
      </View>
      <Pressable
        onPress={onPress}
        disabled={maxed || !plan.affordable}
        style={[styles.buy, (maxed || !plan.affordable) && styles.buyDisabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: maxed || !plan.affordable }}
      >
        {maxed ? (
          <Text style={styles.buyText}>{oneTime ? t('ui.owned') : t('ui.maxed')}</Text>
        ) : (
          <>
            {plan.count > 1 ? <Text style={styles.buyCount}>+{plan.count}</Text> : null}
            <Text style={[styles.buyText, !plan.affordable && styles.buyTextDisabled]}>
              {formatNumber(plan.cost)}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  modes: { flexDirection: 'row', gap: 4 },
  mode: {
    minWidth: UI.minTouch,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  modeText: { color: COLORS.hudSubText, fontWeight: '700', fontSize: 13 },
  modeTextActive: { color: COLORS.accentText },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  cardAffordable: {
    backgroundColor: COLORS.cardBgAffordable,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  icon: { width: 52, height: 52, marginRight: 10 },
  info: { flex: 1, paddingRight: 10 },
  name: { color: COLORS.hudText, fontSize: 16, fontWeight: '700' },
  desc: { color: COLORS.hudSubText, fontSize: 13, marginTop: 2 },
  level: { color: COLORS.accent, fontSize: 12, marginTop: 4, fontWeight: '600' },
  buy: {
    minWidth: 92,
    minHeight: UI.minTouch,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  buyDisabled: { backgroundColor: '#1f2c3a' },
  buyCount: { color: COLORS.accentText, fontSize: 11, fontWeight: '700' },
  buyText: { color: COLORS.accentText, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  buyTextDisabled: { color: COLORS.disabled },
});

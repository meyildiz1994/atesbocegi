import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, UI, UPGRADE_ORDER } from '../config/balance';
import { canPrestige, levelsLeft, upgradeCost } from '../game/economy';
import { useGame } from '../game/state';
import { showBottomBar } from '../game/tutorial';
import { t } from '../i18n';
import { UI_ICONS } from './icons';

export type PanelId = 'upgrades' | 'dawn' | 'store' | 'settings';

/** Herhangi bir yükseltmenin bir seviyesi alınabiliyor mu? */
function useAnyAffordable(): boolean {
  return useGame((s) =>
    UPGRADE_ORDER.some((id) => levelsLeft(id, s.levels[id]) > 0 && s.light >= upgradeCost(id, s.levels[id])),
  );
}

/** Alt çubuk: Mağaza (sol), Yükseltmeler (sağ), üstünde Şafak (eşik geçilince parlar). Orta kavanoza ayrılmıştır. */
export function BottomBar({ onOpen }: { onOpen: (p: PanelId) => void }) {
  const insets = useSafeAreaInsets();
  const affordable = useAnyAffordable();
  const dawnReady = useGame((s) => canPrestige(s.runLight));
  const hasDust = useGame((s) => s.prestigeCount > 0 || s.stardust > 0);
  const visible = useGame((s) => showBottomBar(s.tutorialStep));
  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingBottom: insets.bottom + 8 }]}>
      <BarButton label={t('ui.store')} icon={UI_ICONS.store} onPress={() => onOpen('store')} />
      <View style={styles.right}>
        {dawnReady || hasDust ? (
          <BarButton label={t('dawn.short')} icon={UI_ICONS.dawn} onPress={() => onOpen('dawn')} glow={dawnReady} color={COLORS.dawn} />
        ) : null}
        <BarButton label={t('ui.upgrades')} icon={UI_ICONS.upgrades} onPress={() => onOpen('upgrades')} glow={affordable} />
      </View>
    </View>
  );
}

function BarButton({
  label,
  icon,
  onPress,
  glow,
  color = COLORS.accent,
}: {
  label: string;
  icon: number;
  onPress: () => void;
  glow?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.button, glow && { borderColor: color, shadowColor: color, shadowOpacity: 0.8, backgroundColor: COLORS.cardBgAffordable }]}
    >
      <Image source={icon} style={styles.icon} accessibilityIgnoresInvertColors />
      <Text style={[styles.text, glow && { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  right: { gap: 8, alignItems: 'stretch' },
  button: {
    minHeight: UI.minTouch + 4,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 14,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
  },
  icon: { width: 30, height: 30 },
  text: { color: COLORS.hudText, fontWeight: '700', fontSize: 15 },
});

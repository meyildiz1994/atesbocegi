import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, UI, UPGRADE_ORDER } from '../config/balance';
import { canPrestige, levelsLeft, upgradeCost } from '../game/economy';
import { useGame } from '../game/state';
import { t } from '../i18n';

export type PanelId = 'upgrades' | 'dawn' | 'store';

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

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingBottom: insets.bottom + 8 }]}>
      <BarButton label={t('ui.store')} onPress={() => onOpen('store')} />
      <View style={styles.right}>
        {dawnReady || hasDust ? (
          <BarButton label={t('dawn.short')} onPress={() => onOpen('dawn')} glow={dawnReady} color={COLORS.dawn} />
        ) : null}
        <BarButton label={t('ui.upgrades')} onPress={() => onOpen('upgrades')} glow={affordable} />
      </View>
    </View>
  );
}

function BarButton({
  label,
  onPress,
  glow,
  color = COLORS.accent,
}: {
  label: string;
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
    paddingHorizontal: 18,
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
  text: { color: COLORS.hudText, fontWeight: '700', fontSize: 15 },
});

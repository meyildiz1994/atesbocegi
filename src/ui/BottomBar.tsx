import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

import { COLORS, JAR, UI, UPGRADE_ORDER } from '../config/balance';
import { canPrestige, levelsLeft, upgradeCost } from '../game/economy';
import { useGame } from '../game/state';
import { showBottomBar } from '../game/tutorial';
import { t, type I18nKey } from '../i18n';
import { UI_ICONS } from './icons';

export type PanelId = 'upgrades' | 'dawn' | 'store' | 'settings' | 'events';

/** Alt çubuğun dört yuvası: kavanozun iki yanında ikişer ikon, sırasıyla soldan sağa. */
export const BAR_SLOTS = ['store', 'dawn', 'upgrades', 'settings'] as const;
export type BarSlot = (typeof BAR_SLOTS)[number];

export const BAR_BUTTON = 58;

export const BAR_LABELS: Record<BarSlot, I18nKey> = {
  store: 'ui.store',
  dawn: 'dawn.short',
  upgrades: 'ui.upgrades',
  settings: 'ui.settings',
};

export const BAR_ICONS: Record<BarSlot, number> = {
  store: UI_ICONS.store,
  dawn: UI_ICONS.dawn,
  upgrades: UI_ICONS.upgrades,
  settings: UI_ICONS.gear,
};

/**
 * Yuvaların ekran merkezleri. Kavanoz ekranın ortasında; her iki yandaki boşluğa iki buton
 * eşit aralıkla yerleşir, dikeyde kavanozun ortasıyla hizalanır.
 */
export function barSlotCenters(width: number, height: number, insets: EdgeInsets): Record<BarSlot, { x: number; y: number }> {
  const y = height - insets.bottom - JAR.bottomOffset;
  const side = width / 2 - JAR.width / 2 - 6;
  const gap = (side - 2 * BAR_BUTTON) / 3;
  const a = gap + BAR_BUTTON / 2;
  const b = 2 * gap + (BAR_BUTTON * 3) / 2;
  return {
    store: { x: a, y },
    dawn: { x: b, y },
    upgrades: { x: width - b, y },
    settings: { x: width - a, y },
  };
}

/** Alınabilir yükseltme sayısı (bildirim rozeti için). */
function useAffordableCount(): number {
  return useGame((s) =>
    UPGRADE_ORDER.filter((id) => levelsLeft(id, s.levels[id]) > 0 && s.light >= upgradeCost(id, s.levels[id])).length,
  );
}

/** Alt çubuk: kavanoz ortada, iki yanında yazısız ikon butonlar. Yeni bir şey varsa rozet çıkar. */
export function BottomBar({ onOpen }: { onOpen: (p: PanelId) => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const affordable = useAffordableCount();
  const dawnReady = useGame((s) => canPrestige(s.runLight));
  const hasDust = useGame((s) => s.prestigeCount > 0 || s.stardust > 0);
  const full = useGame((s) => showBottomBar(s.tutorialStep));
  const centers = barSlotCenters(width, height, insets);

  const badge: Record<BarSlot, string | null> = {
    store: null,
    dawn: dawnReady ? '!' : null,
    upgrades: affordable > 0 ? String(affordable) : null,
    settings: null,
  };
  const glow: Record<BarSlot, boolean> = { store: false, dawn: dawnReady, upgrades: affordable > 0, settings: false };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {BAR_SLOTS.map((slot) => {
        // Ayarlar her zaman; diğerleri ilk boşaltmadan sonra belirir (yerleri sabit, kavanoz hep ortada).
        if (slot !== 'settings' && !full) return null;
        const c = centers[slot];
        return (
          <Animated.View
            key={slot}
            entering={FadeIn.duration(400)}
            style={[styles.slot, { left: c.x - BAR_BUTTON / 2, top: c.y - BAR_BUTTON / 2 }]}
          >
            <BarButton
              slot={slot}
              onPress={() => onOpen(slot)}
              glow={glow[slot]}
              dim={slot === 'dawn' && !dawnReady && !hasDust}
              badge={badge[slot]}
              color={slot === 'dawn' ? COLORS.dawn : COLORS.accent}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

function BarButton({
  slot,
  onPress,
  glow,
  dim,
  badge,
  color,
}: {
  slot: BarSlot;
  onPress: () => void;
  glow: boolean;
  dim: boolean;
  badge: string | null;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${t(BAR_LABELS[slot])} (${badge})` : t(BAR_LABELS[slot])}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        glow && { borderColor: color, shadowColor: color, shadowOpacity: 0.9, backgroundColor: COLORS.cardBgAffordable },
        pressed && styles.pressed,
      ]}
    >
      <Image source={BAR_ICONS[slot]} style={[styles.icon, dim && styles.dim]} accessibilityIgnoresInvertColors />
      {dim ? <Image source={UI_ICONS.lock} style={styles.lock} /> : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', width: BAR_BUTTON, height: BAR_BUTTON },
  button: {
    width: BAR_BUTTON,
    height: BAR_BUTTON,
    minHeight: UI.minTouch,
    borderRadius: BAR_BUTTON / 2,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
  },
  pressed: { transform: [{ scale: 0.92 }] },
  icon: { width: 36, height: 36 },
  dim: { opacity: 0.35 },
  lock: { position: 'absolute', width: 18, height: 18, bottom: 6, right: 6 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: COLORS.badge,
    borderWidth: 2,
    borderColor: COLORS.panelBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: COLORS.accentText, fontSize: 12, fontWeight: '800' },
});

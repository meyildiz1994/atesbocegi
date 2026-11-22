import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

import { COLORS } from '../config/balance';
import { selectClaimable, useGame } from '../game/state';
import { gameplayUnlocked } from '../game/tutorial';
import { t } from '../i18n';
import { UI_ICONS } from './icons';

export const META_BUTTON = 54;

/** Gece Bahçesi düğmesinin ekran merkezi (sol üst, güçlendirme düğmesinin karşısı). */
export function metaButtonCenter(insets: EdgeInsets): { x: number; y: number } {
  return { x: 10 + META_BUTTON / 2, y: insets.top + 50 + META_BUTTON / 2 };
}

/** Gece Bahçesi (görevler, bahçe, koleksiyon). Alınacak ödül varsa rozet. */
export function MetaButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const visible = useGame((s) => gameplayUnlocked(s.tutorialStep));
  const claimable = useGame(selectClaimable);
  if (!visible) return null;
  const c = metaButtonCenter(insets);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { left: c.x - META_BUTTON / 2, top: c.y - META_BUTTON / 2 },
        claimable > 0 && styles.glow,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={claimable > 0 ? `${t('a11y.garden')} (${claimable})` : t('a11y.garden')}
    >
      <Image source={UI_ICONS.garden} style={styles.icon} />
      {claimable > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{claimable}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: META_BUTTON,
    height: META_BUTTON,
    borderRadius: META_BUTTON / 2,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
  },
  glow: { borderColor: COLORS.badge, shadowColor: COLORS.badge, shadowOpacity: 0.9 },
  pressed: { transform: [{ scale: 0.92 }] },
  icon: { width: 36, height: 36 },
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

import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, UI } from '../config/balance';
import { t } from '../i18n';
import { UI_ICONS } from './icons';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerRight?: ReactNode;
};

/** Alttan açılan panel. Arka plana dokununca kapanır. */
export function Sheet({ title, onClose, children, headerRight }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('ui.close')}
        />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(260)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.sheet, { maxHeight: height * UI.sheetMaxHeightRatio, paddingBottom: insets.bottom + 12 }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerRight}>
            {headerRight}
            <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel={t('ui.close')}>
              <Image source={UI_ICONS.close} style={styles.closeIcon} />
            </Pressable>
          </View>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#00000088' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.panelBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: COLORS.panelBorder,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: COLORS.hudText, fontSize: 20, fontWeight: '700' },
  close: { width: UI.minTouch, height: UI.minTouch, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { width: 22, height: 22, opacity: 0.85 },
});

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLLECTION, COLORS } from '../config/balance';
import { rareColor } from '../game/meta';
import { useGame } from '../game/state';
import { t, type I18nKey } from '../i18n';
import { hapticSuccess } from '../services/haptics';

const SHOW_MS = 3200;

/** Nadir böcek bulununca kısa bir kart: renkli parıltı ve adı. */
export function RareToast() {
  const insets = useSafeAreaInsets();
  const rare = useGame((s) => s.lastRare);
  // Süresi dolan bildirimin numarası; yeni bulunuş farklı numarayla gelir.
  const [hidden, setHidden] = useState(0);

  useEffect(() => {
    if (!rare) return;
    hapticSuccess();
    const n = rare.n;
    const id = setTimeout(() => setHidden(n), SHOW_MS);
    return () => clearTimeout(id);
  }, [rare]);

  if (!rare || hidden === rare.n) return null;
  const color = rareColor(rare.id);
  return (
    <Animated.View
      key={rare.n}
      entering={ZoomIn.springify()}
      exiting={FadeOut}
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + 210 }]}
    >
      <View style={[styles.card, { borderColor: color, shadowColor: color }]}>
        <View style={[styles.orb, { backgroundColor: color, shadowColor: color }]} />
        <View>
          <Text style={[styles.title, { color }]}>{t('rare.found')}</Text>
          <Text style={styles.name}>{t(`rare.${rare.id}` as I18nKey)}</Text>
          {rare.duplicate ? (
            <Text style={styles.sub}>{t('rare.duplicate', { count: COLLECTION.duplicateTokens })}</Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1.5,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: { width: 30, height: 30, borderRadius: 15, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  title: { fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  name: { color: COLORS.hudText, fontSize: 18, fontWeight: '800' },
  sub: { color: COLORS.hudSubText, fontSize: 12, marginTop: 2 },
});

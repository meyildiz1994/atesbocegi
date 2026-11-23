import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, CONSTELLATION_ORDER, CONSTELLATIONS, UI, type ConstellationId } from '../config/balance';
import { skyComplete, skyCost, starCount } from '../game/constellations';
import { formatNumber } from '../game/numbers';
import { useGame } from '../game/state';
import { t, type I18nKey } from '../i18n';
import { track } from '../services/analytics';
import { hapticSuccess } from '../services/haptics';

const BOX_H = 150;
const PAD = 16;

/** Arka plandaki sabit küçük yıldızlar (deterministik). */
const DUST = Array.from({ length: 70 }, (_, i) => {
  const f = (k: number) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return { x: f(1), y: f(2), r: 0.6 + f(3) * 1.4, o: 0.2 + f(4) * 0.5 };
});

/** Takımyıldız haritası: Yıldız Tozu ile yıldız yakılır, tamamlanan takımyıldız yeni bir güç açar. */
export function SkyMap({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sky = useGame((s) => s.sky);
  const stardust = useGame((s) => s.stardust);
  const buy = useGame((s) => s.buySky);
  const [sel, setSel] = useState<ConstellationId>('hunter');
  const boxW = (width - PAD * 2 - 12) / 2;

  const lit = sky[sel];
  const done = skyComplete(sel, lit);
  const cost = skyCost(sel, lit);
  const c = CONSTELLATIONS[sel];

  const onBuy = () => {
    if (buy(sel)) {
      hapticSuccess();
      track('sky_star', { id: sel, lit: lit + 1 });
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.screen]}>
      {DUST.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: d.x * width,
            top: d.y * height,
            width: d.r * 2,
            height: d.r * 2,
            borderRadius: d.r,
            backgroundColor: '#fff',
            opacity: d.o,
          }}
        />
      ))}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>{t('sky.title')}</Text>
        <Text style={styles.dust}>{t('sky.dust', { n: formatNumber(stardust) })}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {CONSTELLATION_ORDER.map((id) => (
          <Constellation key={id} id={id} lit={sky[id]} selected={sel === id} w={boxW} onPress={() => setSel(id)} />
        ))}
      </ScrollView>
      <Animated.View key={sel} entering={ZoomIn.springify()} style={[styles.panel, { borderColor: c.color, marginBottom: insets.bottom + 8 }]}>
        <View style={styles.panelRow}>
          <Text style={[styles.panelTitle, { color: c.color }]}>{t(`sky.${sel}` as I18nKey)}</Text>
          <Text style={styles.panelCount}>
            {lit} / {starCount(sel)}
          </Text>
        </View>
        <Text style={styles.panelText}>{t(`sky.${sel}.star` as I18nKey, { pct: Math.round(c.perStar * 100) })}</Text>
        <Text style={[styles.panelText, done && { color: c.color }]}>
          {done ? '✓ ' : '★ '}
          {t(`sky.${sel}.done` as I18nKey)}
        </Text>
        <View style={styles.buttons}>
          <Pressable onPress={onClose} style={[styles.button, styles.back]} accessibilityRole="button">
            <Text style={styles.backText}>{t('sky.back')}</Text>
          </Pressable>
          <Pressable
            onPress={onBuy}
            disabled={done || stardust < cost}
            style={[styles.button, { backgroundColor: c.color }, (done || stardust < cost) && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.buyText}>{done ? t('sky.complete') : t('sky.light', { n: cost })}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function Constellation({ id, lit, selected, w, onPress }: { id: ConstellationId; lit: number; selected: boolean; w: number; onPress: () => void }) {
  const c = CONSTELLATIONS[id];
  const pts = c.stars.map(([u, v]) => [14 + u * (w - 28), 12 + v * (BOX_H - 44)] as const);
  const done = skyComplete(id, lit);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.box, { width: w }, selected && { borderColor: c.color, backgroundColor: '#ffffff0d' }]}
      accessibilityRole="button"
    >
      {pts.slice(1).map((p, i) => {
        const a = pts[i]!;
        const dx = p[0] - a[0];
        const dy = p[1] - a[1];
        const len = Math.hypot(dx, dy);
        const on = i + 1 < lit;
        return (
          <View
            key={`l${i}`}
            style={{
              position: 'absolute',
              left: (a[0] + p[0]) / 2 - len / 2,
              top: (a[1] + p[1]) / 2 - 1,
              width: len,
              height: on ? 2 : 1,
              backgroundColor: on ? c.color : '#ffffff30',
              transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
            }}
          />
        );
      })}
      {pts.map((p, i) => {
        const on = i < lit;
        const next = i === lit;
        const r = on ? 7 : 5;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: p[0] - r,
              top: p[1] - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              backgroundColor: on ? c.color : '#ffffff40',
              borderWidth: next ? 2 : 0,
              borderColor: c.color,
              shadowColor: c.color,
              shadowOpacity: on ? 1 : 0,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        );
      })}
      <Text style={[styles.boxName, { color: done ? c.color : COLORS.hudText }]}>
        {t(`sky.${id}` as I18nKey)} {done ? '✓' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#050816', zIndex: 10 },
  header: { alignItems: 'center', paddingBottom: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  dust: { color: COLORS.stardust, fontSize: 14, fontWeight: '800', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingHorizontal: PAD, paddingBottom: 12 },
  box: { height: BOX_H, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff1a', overflow: 'hidden' },
  boxName: { position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  panel: {
    marginHorizontal: PAD,
    backgroundColor: COLORS.panelBg,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 18, fontWeight: '900' },
  panelCount: { color: COLORS.hudSubText, fontWeight: '800' },
  panelText: { color: COLORS.hudText, fontSize: 13, lineHeight: 18 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  button: { flex: 1, minHeight: UI.minTouch, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  back: { flex: 0.6, borderWidth: 1, borderColor: COLORS.panelBorder },
  backText: { color: COLORS.hudSubText, fontWeight: '800' },
  buyText: { color: '#14102a', fontWeight: '900', fontSize: 15 },
  disabled: { opacity: 0.4 },
});

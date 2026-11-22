import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, RATE_WINDOW_SECONDS, UI, ZONES } from "../config/balance";
import { unlockedZoneCount } from "../game/economy";
import { formatNumber } from "../game/numbers";
import { lightPerSecond, statsOf, useGame, useStats } from "../game/state";
import { TUTORIAL_STEP } from "../game/tutorial";
import { t, type I18nKey } from "../i18n";
import { UI_ICONS } from "./icons";

/**
 * Işık/sn göstergesi: yakalanan böceklerin değeri de sayılır (kavanoz boşaltılmasa da artar).
 * Her saniye "kazanılmış + kavanozdaki" Işık örneklenir; son pencere üzerinden ortalama alınır.
 */
function useLightPerSecond(): number {
  const [rate, setRate] = useState(0);
  useEffect(() => {
    const samples: [number, number][] = [];
    const id = setInterval(() => {
      const s = useGame.getState();
      const now = Date.now();
      const potential = s.lifetimeLight + s.jarCount * statsOf(s).valuePerFirefly;
      samples.push([now, potential]);
      while (samples.length > 1 && now - samples[0]![0] > RATE_WINDOW_SECONDS * 1000) samples.shift();
      const first = samples[0]!;
      const dt = (now - first[0]) / 1000;
      // Kavanoz boşalınca boost çarpanı sıçrama yapabilir; negatif farkı (Şafak) sıfırla.
      setRate(dt > 0 ? Math.max(0, (potential - first[1]) / dt) : lightPerSecond(s, now));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return rate;
}

/** Üst bilgi: bölge başlığı (oklarla), sonraki bölgenin ilerleme çubuğu, büyük Işık sayacı, Işık/sn ve kavanoz. */
export function Hud() {
  const insets = useSafeAreaInsets();
  const light = useGame((s) => s.light);
  const jarCount = useGame((s) => s.jarCount);
  const zoneIndex = useGame((s) => s.zoneIndex);
  const runLight = useGame((s) => s.runLight);
  const setZone = useGame((s) => s.setZone);
  const stats = useStats();
  const rate = useLightPerSecond();
  // Onboarding'in oynanış kısmı bitene kadar yalnızca Işık sayacı görünür.
  const full = useGame((s) => s.tutorialStep >= TUTORIAL_STEP.tour);

  const unlocked = unlockedZoneCount(runLight);
  const hasPrev = zoneIndex > 0;
  const next = ZONES[zoneIndex + 1];
  const nextOpen = zoneIndex + 1 < unlocked;
  const locked = !!next && !nextOpen;
  const progress = locked ? Math.min(1, runLight / next.unlockAt) : 0;

  return (
    <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 4 }]}>
      {full ? (
        <View style={styles.zonePill}>
          <Pressable
            onPress={() => setZone(zoneIndex - 1)}
            disabled={!hasPrev}
            style={[styles.arrow, !hasPrev && styles.hidden]}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.prevZone")}
          >
            <Image source={UI_ICONS.left} style={styles.arrowIcon} />
          </Pressable>
          <Text style={styles.zone} numberOfLines={1}>
            {t(`zone.${zoneIndex + 1}` as I18nKey)}
          </Text>
          <Pressable
            onPress={() => setZone(zoneIndex + 1)}
            disabled={!next || !nextOpen}
            style={[styles.arrow, !next && styles.hidden]}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.nextZone")}
          >
            <Image source={locked ? UI_ICONS.lock : UI_ICONS.right} style={styles.arrowIcon} />
          </Pressable>
        </View>
      ) : null}
      {full && locked ? (
        <View
          style={styles.unlock}
          accessible
          accessibilityLabel={t("ui.locked", { amount: formatNumber(next.unlockAt) })}
        >
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${Math.max(2, progress * 100)}%` }]} />
          </View>
          <Text style={styles.unlockText}>
            {t("zone.progress", { current: formatNumber(runLight), target: formatNumber(next.unlockAt) })}
          </Text>
        </View>
      ) : null}
      <View pointerEvents="none" style={styles.center}>
        <Text style={styles.light} accessibilityRole="text">
          {formatNumber(light)}
        </Text>
        <View style={styles.chips}>
          {full ? (
            <View style={styles.chip}>
              <Image source={UI_ICONS.boost} style={styles.chipIcon} />
              <Text style={styles.chipText}>{t("hud.perSecond", { value: formatNumber(rate) })}</Text>
            </View>
          ) : null}
          <View style={styles.chip}>
            <Image source={UI_ICONS.upgrades} style={styles.chipIcon} />
            <Text style={styles.chipText}>{t("hud.perJar", { count: jarCount, capacity: stats.jarCapacity })}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  zonePill: {
    flexDirection: "row",
    alignItems: "center",
    height: UI.minTouch,
    paddingHorizontal: 2,
    borderRadius: UI.minTouch / 2,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  arrow: {
    width: UI.minTouch,
    height: UI.minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIcon: { width: 22, height: 22 },
  hidden: { opacity: 0 },
  zone: {
    color: COLORS.hudText,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
    minWidth: 130,
    textAlign: "center",
    textShadowColor: COLORS.firefly,
    textShadowRadius: 8,
  },
  unlock: { alignItems: "center", marginTop: 6, gap: 3 },
  track: {
    width: 150,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#0a1a1fcc",
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    overflow: "hidden",
  },
  trackFill: { height: "100%", borderRadius: 3, backgroundColor: COLORS.accent },
  unlockText: { color: COLORS.hudSubText, fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
  center: { alignItems: "center", marginTop: 2 },
  light: {
    color: COLORS.hudText,
    fontSize: 46,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textShadowColor: COLORS.firefly,
    textShadowRadius: 14,
  },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 6,
    paddingRight: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.panelBg,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  chipIcon: { width: 18, height: 18 },
  chipText: { color: COLORS.hudText, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
});

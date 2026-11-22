import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS, MONETIZATION, UI } from '../config/balance';
import { starterDiscountActive } from '../game/monetization';
import { useGame } from '../game/state';
import { t } from '../i18n';
import { track } from '../services/analytics';
import { buy, iapAvailable, loadProducts, restore, type ProductKind, type StoreProduct } from '../services/iap';
import { hapticSuccess } from '../services/haptics';
import { Sheet } from './Sheet';

type Status = 'loading' | 'ready' | 'unavailable';

/** Mağaza: Reklamları Kaldır, Başlangıç Paketi (ilk 48 saatte indirimli), geri yükleme. */
export function StorePanel({ onClose }: { onClose: () => void }) {
  const purchases = useGame((s) => s.purchases);
  const firstLaunchAt = useGame((s) => s.firstLaunchAt);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [status, setStatus] = useState<Status>(iapAvailable() ? 'loading' : 'unavailable');
  const [busy, setBusy] = useState<ProductKind | 'restore' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    track('iap_view', {});
    if (!iapAvailable()) return;
    let alive = true;
    void loadProducts().then((list) => {
      if (!alive) return;
      setProducts(list);
      setStatus(list.length > 0 ? 'ready' : 'unavailable');
    });
    return () => {
      alive = false;
    };
  }, []);

  // İlk 48 saatte indirimli Başlangıç Paketi, sonra normal fiyatlısı gösterilir.
  const [now] = useState(() => Date.now());
  const launch = starterDiscountActive(firstLaunchAt, now);
  const useLaunch = launch && products.some((p) => p.kind === 'starterLaunch');
  const hidden: ProductKind = useLaunch ? 'starter' : 'starterLaunch';
  const visible = products.filter((p) => p.kind !== hidden);

  const owned = (k: ProductKind) => (k === 'removeAds' ? purchases.removeAds : purchases.starter);

  const onBuy = async (k: ProductKind) => {
    setBusy(k);
    setNote(null);
    const r = await buy(k);
    setBusy(null);
    if (r === 'purchased') hapticSuccess();
    if (r === 'failed') setNote(t('store.failed'));
  };

  const onRestore = async () => {
    setBusy('restore');
    const ok = await restore();
    setBusy(null);
    setNote(ok ? t('store.restored') : t('store.nothingToRestore'));
  };

  return (
    <Sheet title={t('ui.store')} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.body}>
        {status === 'loading' ? <ActivityIndicator color={COLORS.accent} style={styles.loading} /> : null}
        {status === 'unavailable' ? <Text style={styles.muted}>{t('store.unavailable')}</Text> : null}
        {visible.map((p) => (
          <View key={p.kind} style={[styles.card, p.kind !== 'removeAds' && styles.starterCard]}>
            <View style={styles.info}>
              <Text style={styles.name}>{t(p.kind === 'removeAds' ? 'store.removeAds' : 'store.starter')}</Text>
              <Text style={styles.desc}>
                {p.kind === 'removeAds'
                  ? t('store.removeAdsDesc')
                  : t('store.starterDesc', { mult: MONETIZATION.starterMultiplier })}
              </Text>
              {p.kind === 'starterLaunch' ? <Text style={styles.badge}>{t('store.launchOffer')}</Text> : null}
            </View>
            <Pressable
              onPress={() => onBuy(p.kind)}
              disabled={owned(p.kind) || busy !== null}
              style={[styles.buy, (owned(p.kind) || busy !== null) && styles.disabled]}
              accessibilityRole="button"
            >
              {busy === p.kind ? (
                <ActivityIndicator color={COLORS.accentText} />
              ) : (
                <Text style={styles.buyText}>{owned(p.kind) ? t('ui.owned') : p.price}</Text>
              )}
            </Pressable>
          </View>
        ))}
        {note ? <Text style={styles.muted}>{note}</Text> : null}
        {iapAvailable() ? (
          <Pressable onPress={onRestore} disabled={busy !== null} style={styles.restore} accessibilityRole="button">
            <Text style={styles.restoreText}>{t('store.restore')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  loading: { padding: 24 },
  muted: { color: COLORS.hudSubText, fontSize: 14, textAlign: 'center', padding: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  starterCard: { borderColor: COLORS.stardust },
  info: { flex: 1, paddingRight: 10 },
  name: { color: COLORS.hudText, fontSize: 16, fontWeight: '700' },
  desc: { color: COLORS.hudSubText, fontSize: 13, marginTop: 2 },
  badge: { color: COLORS.stardust, fontSize: 12, fontWeight: '700', marginTop: 4 },
  buy: {
    minWidth: 92,
    minHeight: UI.minTouch,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  disabled: { opacity: 0.45 },
  buyText: { color: COLORS.accentText, fontSize: 15, fontWeight: '800' },
  restore: { minHeight: UI.minTouch, alignItems: 'center', justifyContent: 'center' },
  restoreText: { color: COLORS.hudSubText, fontSize: 14, textDecorationLine: 'underline' },
});

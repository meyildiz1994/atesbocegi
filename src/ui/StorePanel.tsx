import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_CONFIG } from '../config/app';
import { COLORS, MONETIZATION, NIGHT_PASS, STORE, UI, VIP, ZONES, type SkinId } from '../config/balance';
import { localDay } from '../game/meta';
import { starterDiscountActive } from '../game/monetization';
import { formatNumber } from '../game/numbers';
import { lightPerSecond, useGame, useStats } from '../game/state';
import { currentPass, lightForHours, passReward, passTier, seasonEndsAt, type PassReward } from '../game/store';
import { t, type I18nKey } from '../i18n';
import { track } from '../services/analytics';
import { hapticSuccess } from '../services/haptics';
import { buy, iapAvailable, loadProducts, restore, type ProductKind, type StoreProduct } from '../services/iap';
import { UI_ICONS } from './icons';
import { SoftGlow } from './SoftGlow';

type Tab = 'treasure' | 'offers' | 'pass' | 'skins';
const TABS: Tab[] = ['treasure', 'offers', 'pass', 'skins'];
const TAB_ICONS: Record<Tab, number> = {
  treasure: UI_ICONS.chest,
  offers: UI_ICONS.boost,
  pass: UI_ICONS.quests,
  skins: UI_ICONS.collection,
};

const clock = () => Date.now();

type Shop = {
  price: (k: ProductKind) => string;
  busy: ProductKind | 'restore' | null;
  onBuy: (k: ProductKind) => void;
};

/** Mağaza: Hazine (kavanoz ve Işık paketleri), Teklifler, Gece Kartı, Kostümler. */
export function StorePanel({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('treasure');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(iapAvailable());
  const [busy, setBusy] = useState<ProductKind | 'restore' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    track('iap_view', {});
    if (!iapAvailable()) return;
    let alive = true;
    void loadProducts().then((list) => {
      if (!alive) return;
      setProducts(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 2800);
    return () => clearTimeout(id);
  }, [note]);

  const shop: Shop = {
    busy,
    price: (k) => products.find((p) => p.kind === k)?.price ?? fallbackPrice(k),
    onBuy: async (k) => {
      if (!products.some((p) => p.kind === k)) {
        setNote(t(loading ? 'store.loading' : 'store.unavailable'));
        return;
      }
      setBusy(k);
      const r = await buy(k);
      setBusy(null);
      if (r === 'purchased') {
        hapticSuccess();
        setNote(t('store.thanks'));
      }
      if (r === 'failed') setNote(t('store.failed'));
    },
  };

  const onRestore = async () => {
    setBusy('restore');
    const ok = await restore();
    setBusy(null);
    setNote(ok ? t('store.restored') : t('store.nothingToRestore'));
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, styles.backdrop]} />
      <Animated.View
        entering={SlideInDown.duration(260)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.screen, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 6 }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t(`store.tab.${tab}` as I18nKey)}</Text>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel={t('ui.close')}>
            <Image source={UI_ICONS.close} style={styles.closeIcon} />
          </Pressable>
        </View>
        <View style={styles.tabs}>
          {TABS.map((id) => (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              style={[styles.tab, tab === id && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
            >
              <Image source={TAB_ICONS[id]} style={styles.tabIcon} />
              <Text style={[styles.tabText, tab === id && styles.tabTextActive]} numberOfLines={1}>
                {t(`store.tab.${id}` as I18nKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {tab === 'treasure' ? <Treasure shop={shop} /> : null}
          {tab === 'offers' ? <Offers shop={shop} /> : null}
          {tab === 'pass' ? <NightPass shop={shop} /> : null}
          {tab === 'skins' ? <Skins shop={shop} /> : null}
          {iapAvailable() ? (
            <Pressable onPress={onRestore} disabled={busy !== null} style={styles.restore} accessibilityRole="button">
              <Text style={styles.restoreText}>{t('store.restore')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {note ? (
          <Animated.View entering={ZoomIn} exiting={FadeOut} style={styles.note} pointerEvents="none">
            <Text style={styles.noteText}>{note}</Text>
          </Animated.View>
        ) : null}
        <Wallet />
      </Animated.View>
    </View>
  );
}

function fallbackPrice(k: ProductKind): string {
  const pack = [...STORE.tokenPacks, ...STORE.lightPacks].find((p) => p.id === k);
  if (pack) return pack.fallbackPrice;
  if (k.startsWith('skin_')) return STORE.skins.find((s) => `skin_${s.id}` === k)?.fallbackPrice ?? '';
  return STORE.fallbackPrices[k as keyof typeof STORE.fallbackPrices] ?? '';
}

// ---------------------------------------------------------------------------
// Hazine: kavanoz ve Işık paketleri, büyüyen yığınlar.

function Treasure({ shop }: { shop: Shop }) {
  const [sub, setSub] = useState<'tokens' | 'light'>('tokens');
  const stats = useStats();
  const [now] = useState(clock);
  const lps = useGame((s) => lightPerSecond(s, now));
  const jarValue = stats.jarCapacity * stats.valuePerFirefly;
  return (
    <>
      <View style={styles.subTabs}>
        {(['tokens', 'light'] as const).map((id) => (
          <Pressable key={id} onPress={() => setSub(id)} style={[styles.subTab, sub === id && styles.subTabActive]} accessibilityRole="tab">
            <Text style={[styles.subTabText, sub === id && styles.subTabTextActive]}>{t(`store.sub.${id}` as I18nKey)}</Text>
          </Pressable>
        ))}
      </View>
      {sub === 'tokens' ? (
        <View style={styles.explain}>
          <Image source={UI_ICONS.upgrades} style={styles.explainIcon} />
          <Text style={styles.explainText}>{t('store.tokenExplain')}</Text>
        </View>
      ) : null}
      <View style={styles.grid}>
        {sub === 'tokens'
          ? STORE.tokenPacks.map((p, i) => (
              <PackCard
                key={p.id}
                kind={p.id}
                shop={shop}
                name={t(`store.pack.${p.id}` as I18nKey)}
                bonus={p.bonus}
                amount={formatNumber(p.tokens)}
                sub={t('store.tokenUse')}
                icon={UI_ICONS.upgrades}
                art={<Pile icon={UI_ICONS.upgrades} tier={i} />}
              />
            ))
          : STORE.lightPacks.map((p, i) => (
              <PackCard
                key={p.id}
                kind={p.id}
                shop={shop}
                name={t(`store.pack.${p.id}` as I18nKey)}
                bonus={p.bonus}
                amount={formatNumber(lightForHours(p.hours, lps, jarValue))}
                sub={t('store.hours', { n: p.hours })}
                icon={UI_ICONS.golden}
                art={<Pile icon={UI_ICONS.golden} tier={i + 1} gold />}
              />
            ))}
      </View>
    </>
  );
}

function PackCard(props: {
  kind: ProductKind;
  shop: Shop;
  name: string;
  bonus: number;
  amount: string;
  sub?: string;
  icon: number;
  art: ReactNode;
}) {
  const { kind, shop } = props;
  return (
    <Pressable onPress={() => shop.onBuy(kind)} disabled={shop.busy !== null} style={styles.pack} accessibilityRole="button">
      <View style={styles.packTop} />
      <Text style={styles.packName} numberOfLines={1} adjustsFontSizeToFit>
        {props.name}
      </Text>
      <View style={styles.packAmountRow}>
        <Image source={props.icon} style={styles.packAmountIcon} />
        <Text style={styles.packAmount}>{props.amount}</Text>
      </View>
      {props.sub ? <Text style={styles.packSub}>{props.sub}</Text> : null}
      <View style={styles.packArt}>{props.art}</View>
      {props.bonus > 0 ? (
        <View style={styles.bonus}>
          <Text style={styles.bonusText}>{t('store.bonus', { n: props.bonus })}</Text>
        </View>
      ) : null}
      <PriceBar label={shop.price(kind)} busy={shop.busy === kind} />
    </Pressable>
  );
}

function PriceBar({ label, busy, owned }: { label: string; busy: boolean; owned?: boolean }) {
  return (
    <View style={[styles.priceBar, owned && styles.priceOwned]}>
      {busy ? <ActivityIndicator color="#2a1a00" /> : <Text style={styles.priceText}>{label}</Text>}
    </View>
  );
}

/** Paket büyüdükçe yığın da büyür: tek ikon → yığın → sandıkla yığın. */
const PILES: [number, number, number][][] = [
  [[0, 6, 62]],
  [
    [-26, 18, 46],
    [26, 18, 46],
    [0, 0, 60],
  ],
  [
    [-36, 22, 42],
    [36, 22, 42],
    [-16, 10, 48],
    [16, 10, 48],
    [0, -6, 58],
  ],
  [
    [-42, 26, 40],
    [42, 26, 40],
    [-22, 18, 44],
    [22, 18, 44],
    [0, 20, 46],
    [-12, -4, 50],
    [12, -4, 50],
  ],
];

function Pile({ icon, tier, gold }: { icon: number; tier: number; gold?: boolean }) {
  const pile = PILES[Math.min(PILES.length - 1, tier)]!;
  const chest = tier >= 3;
  return (
    <View style={styles.pile}>
      <SoftGlow size={150} color={gold ? '#ffd24a' : '#8fd0ff'} style={{ left: -5, top: -25, opacity: gold ? 0.45 : 0.35, transform: [{ scale: 0.7 + tier * 0.15 }] }} />
      {chest ? <Image source={UI_ICONS.chest} style={styles.pileChest} /> : null}
      {pile.map(([x, y, size], i) => (
        <Image
          key={i}
          source={icon}
          style={{ position: 'absolute', width: size, height: size, left: 70 + x - size / 2, top: 40 + y - size / 2 + (chest ? 16 : 0) }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Teklifler: Gece Işığı (abonelik), kalıcı ×2, reklamsız.

function Offers({ shop }: { shop: Shop }) {
  const purchases = useGame((s) => s.purchases);
  const firstLaunchAt = useGame((s) => s.firstLaunchAt);
  const vipDay = useGame((s) => s.vipDay);
  const claimVip = useGame((s) => s.claimVipDaily);
  const [now] = useState(clock);
  const launch = starterDiscountActive(firstLaunchAt, now);
  const starterKind: ProductKind = launch ? 'starterLaunch' : 'starter';
  const vipClaimed = vipDay === localDay(now);

  return (
    <View style={styles.offers}>
      <OfferCard
        color="#c9b6ff"
        title={t('store.vip')}
        tag={t('store.vipTag')}
        lines={[
          t('store.vipLight', { mult: VIP.lightMult }),
          t('store.vipTokens', { n: VIP.dailyTokens }),
          t('store.vipAds'),
        ]}
        icon={UI_ICONS.golden}
        action={
          purchases.vip ? (
            <Pressable
              onPress={() => claimVip(clock()) > 0 && hapticSuccess()}
              disabled={vipClaimed}
              style={[styles.offerButton, vipClaimed && styles.disabled]}
              accessibilityRole="button"
            >
              <Text style={styles.offerButtonText}>{vipClaimed ? t('store.vipClaimed') : t('store.vipClaim', { n: VIP.dailyTokens })}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => shop.onBuy('vip')} style={styles.offerButton} accessibilityRole="button">
              {shop.busy === 'vip' ? (
                <ActivityIndicator color="#2a1a00" />
              ) : (
                <Text style={styles.offerButtonText}>{t('store.perMonth', { price: shop.price('vip') })}</Text>
              )}
            </Pressable>
          )
        }
      />
      {purchases.vip ? null : (
        <View style={styles.legal}>
          <Text style={styles.legalText}>{t('store.vipLegal', { price: shop.price('vip') })}</Text>
          <View style={styles.legalLinks}>
            <Text style={styles.legalLink} onPress={() => void Linking.openURL(APP_CONFIG.termsUrl)} accessibilityRole="link">
              {t('settings.terms')}
            </Text>
            <Text style={styles.legalLink} onPress={() => void Linking.openURL(APP_CONFIG.privacyPolicyUrl)} accessibilityRole="link">
              {t('settings.privacyPolicy')}
            </Text>
          </View>
        </View>
      )}
      <OfferCard
        color={COLORS.jarFull}
        title={t('store.starter')}
        tag={launch && !purchases.starter ? t('store.launchOffer') : undefined}
        lines={[t('store.starterDesc', { mult: MONETIZATION.starterMultiplier })]}
        icon={UI_ICONS.boost}
        action={<BuyButton kind={starterKind} owned={purchases.starter} shop={shop} />}
      />
      <OfferCard
        color={COLORS.accent}
        title={t('store.removeAds')}
        lines={[t('store.removeAdsDesc')]}
        icon={UI_ICONS.ad}
        action={<BuyButton kind="removeAds" owned={purchases.removeAds} shop={shop} />}
      />
    </View>
  );
}

function BuyButton({ kind, owned, shop }: { kind: ProductKind; owned: boolean; shop: Shop }) {
  return (
    <Pressable
      onPress={() => shop.onBuy(kind)}
      disabled={owned || shop.busy !== null}
      style={[styles.offerButton, owned && styles.disabled]}
      accessibilityRole="button"
    >
      {shop.busy === kind ? <ActivityIndicator color="#2a1a00" /> : <Text style={styles.offerButtonText}>{owned ? t('ui.owned') : shop.price(kind)}</Text>}
    </Pressable>
  );
}

function OfferCard(props: { color: string; title: string; tag?: string; lines: string[]; icon: number; action: ReactNode }) {
  return (
    <View style={[styles.offer, { borderColor: props.color }]}>
      <View style={styles.packTop} />
      <View style={styles.offerRow}>
        <View style={styles.offerArt}>
          <SoftGlow size={100} color={props.color} style={{ opacity: 0.45 }} />
          <Image source={props.icon} style={styles.offerIcon} />
        </View>
        <View style={styles.offerInfo}>
          <Text style={[styles.offerTitle, { color: props.color }]}>{props.title}</Text>
          {props.lines.map((l) => (
            <Text key={l} style={styles.offerLine}>
              • {l}
            </Text>
          ))}
        </View>
      </View>
      {props.tag ? (
        <View style={[styles.tag, { backgroundColor: props.color }]}>
          <Text style={styles.tagText}>{props.tag}</Text>
        </View>
      ) : null}
      {props.action}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Gece Kartı: sezonluk basamaklar, ücretsiz ve premium yol.

function NightPass({ shop }: { shop: Shop }) {
  const [now] = useState(clock);
  const raw = useGame((s) => s.pass);
  const claim = useGame((s) => s.claimPass);
  const pass = currentPass(raw, now);
  const tier = passTier(pass.jars);
  const daysLeft = Math.max(0, Math.ceil((seasonEndsAt(pass.season) - now) / 86_400_000));
  const inTier = tier >= NIGHT_PASS.tiers ? NIGHT_PASS.jarsPerTier : pass.jars % NIGHT_PASS.jarsPerTier;

  const take = (n: number, premium: boolean) => {
    if (claim(n, premium, clock())) hapticSuccess();
  };

  return (
    <View style={styles.passWrap}>
      <View style={styles.passHead}>
        <Text style={styles.passSeason}>{t('pass.season', { n: pass.season + 1, days: daysLeft })}</Text>
        <Text style={styles.passHint}>{t('pass.hint', { n: NIGHT_PASS.jarsPerTier })}</Text>
        <View style={styles.passBar}>
          <View style={[styles.passFill, { width: `${Math.round((inTier / NIGHT_PASS.jarsPerTier) * 100)}%` }]} />
        </View>
        <Text style={styles.passHint}>{t('pass.tier', { n: tier, max: NIGHT_PASS.tiers })}</Text>
        {!pass.premium ? (
          <Pressable onPress={() => shop.onBuy('pass')} style={[styles.offerButton, styles.passBuy]} accessibilityRole="button">
            {shop.busy === 'pass' ? (
              <ActivityIndicator color="#2a1a00" />
            ) : (
              <Text style={styles.offerButtonText}>{t('pass.buy', { price: shop.price('pass') })}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      <View style={styles.passCols}>
        <Text style={styles.passCol}>{t('pass.free')}</Text>
        <View style={styles.passMid} />
        <Text style={[styles.passCol, styles.passColPremium]}>{t('pass.premium')}</Text>
      </View>
      {Array.from({ length: NIGHT_PASS.tiers }, (_, i) => i + 1).map((n) => {
        const reached = n <= tier;
        return (
          <View key={n} style={styles.passRow}>
            <RewardChip
              reward={passReward(n, false)}
              state={pass.claimedFree.includes(n) ? 'claimed' : reached ? 'ready' : 'locked'}
              onPress={() => take(n, false)}
            />
            <View style={[styles.passNode, reached && styles.passNodeOn]}>
              <Text style={[styles.passNodeText, reached && styles.passNodeTextOn]}>{n}</Text>
            </View>
            <RewardChip
              premium
              reward={passReward(n, true)}
              state={pass.claimedPremium.includes(n) ? 'claimed' : reached && pass.premium ? 'ready' : 'locked'}
              onPress={() => take(n, true)}
            />
          </View>
        );
      })}
    </View>
  );
}

function RewardChip(props: { reward: PassReward; state: 'locked' | 'ready' | 'claimed'; premium?: boolean; onPress: () => void }) {
  const { reward, state } = props;
  const icon = reward.skin ? SKIN_ART[reward.skin] : reward.lightHours ? UI_ICONS.golden : UI_ICONS.upgrades;
  const label = reward.skin
    ? t('pass.skin')
    : reward.lightHours
      ? t('store.hours', { n: reward.lightHours })
      : `×${reward.tokens}`;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={state !== 'ready'}
      style={[styles.chip, props.premium && styles.chipPremium, state === 'ready' && styles.chipReady, state === 'claimed' && styles.chipClaimed]}
      accessibilityRole="button"
    >
      <Image source={icon} style={styles.chipIcon} />
      <Text style={styles.chipText}>{label}</Text>
      {state === 'claimed' ? <Text style={styles.chipCheck}>✓</Text> : null}
      {state === 'locked' && props.premium ? <Image source={UI_ICONS.lock} style={styles.chipLock} /> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Kostümler: ateşböceği rengi.

function Skins({ shop }: { shop: Shop }) {
  const owned = useGame((s) => s.skins);
  const current = useGame((s) => s.skin);
  const zoneIndex = useGame((s) => s.zoneIndex);
  const setSkin = useGame((s) => s.setSkin);
  const cards: { id: SkinId | null; color: string }[] = [
    { id: null, color: (ZONES[zoneIndex] ?? ZONES[0]).fireflyColor },
    ...STORE.skins.map((s) => ({ id: s.id, color: s.color })),
  ];
  return (
    <View style={styles.grid}>
      {cards.map(({ id, color }) => {
        const has = id === null || owned.includes(id);
        const selected = current === id;
        const passOnly = id === NIGHT_PASS.finalSkin;
        return (
          <Pressable
            key={id ?? 'default'}
            onPress={() => (has ? setSkin(id) : !passOnly && id ? shop.onBuy(`skin_${id}` as ProductKind) : undefined)}
            style={[styles.pack, selected && { borderColor: color }]}
            accessibilityRole="button"
          >
            <View style={styles.packTop} />
            <Text style={styles.packName}>{t(`skin.${id ?? 'default'}` as I18nKey)}</Text>
            <View style={styles.skinArt}>
              <SkinArt id={id} color={color} locked={!has} />
            </View>
            {has ? (
              <View style={[styles.priceBar, selected ? styles.priceOwned : styles.priceEquip]}>
                <Text style={styles.priceText}>{selected ? t('skin.equipped') : t('skin.equip')}</Text>
              </View>
            ) : passOnly ? (
              <View style={[styles.priceBar, styles.priceEquip]}>
                <Text style={styles.priceText}>{t('skin.passOnly')}</Text>
              </View>
            ) : (
              <PriceBar label={shop.price(`skin_${id}` as ProductKind)} busy={shop.busy === `skin_${id}`} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const SKIN_ART: Record<SkinId | 'default', number> = {
  default: require('../../assets/ui/skin_default.png'),
  ember: require('../../assets/ui/skin_ember.png'),
  aurora: require('../../assets/ui/skin_aurora.png'),
  sakura: require('../../assets/ui/skin_sakura.png'),
  starlight: require('../../assets/ui/skin_starlight.png'),
};

function SkinArt({ id, color, locked }: { id: SkinId | null; color: string; locked: boolean }) {
  return (
    <View style={styles.skinWrap}>
      <SoftGlow size={170} color={color} style={{ opacity: 0.75 }} />
      <Image source={SKIN_ART[id ?? 'default']} style={[styles.skinImg, locked && styles.skinLocked]} resizeMode="contain" />
    </View>
  );
}

// ---------------------------------------------------------------------------

function Wallet() {
  const tokens = useGame((s) => Math.floor(s.jarTokens));
  const stardust = useGame((s) => s.stardust);
  const light = useGame((s) => s.light);
  return (
    <View style={styles.wallet}>
      <Coin icon={UI_ICONS.golden} value={formatNumber(light)} />
      <Coin icon={UI_ICONS.upgrades} value={formatNumber(tokens)} />
      <Coin icon={UI_ICONS.dawn} value={formatNumber(stardust)} />
    </View>
  );
}

function Coin({ icon, value }: { icon: number; value: string }) {
  return (
    <View style={styles.coin}>
      <Image source={icon} style={styles.coinIcon} />
      <Text style={styles.coinText}>{value}</Text>
    </View>
  );
}

const CARD = '#1d3f73';
const CARD_TOP = '#2b5c9e';
const CARD_EDGE = '#5f9be0';
const PRICE = '#ffd24a';

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000000aa' },
  screen: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#0a1426f7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 48 },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: '#000',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  close: { position: 'absolute', right: 8, width: UI.minTouch, height: UI.minTouch, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { width: 26, height: 26 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 8 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#13233d',
    borderWidth: 1,
    borderColor: '#24406a',
  },
  tabActive: { backgroundColor: '#24477c', borderColor: CARD_EDGE },
  tabIcon: { width: 34, height: 34 },
  tabText: { color: COLORS.hudSubText, fontSize: 11, fontWeight: '800', marginTop: 2 },
  tabTextActive: { color: '#fff' },
  body: { paddingHorizontal: 12, paddingBottom: 16 },
  subTabs: { flexDirection: 'row', alignSelf: 'center', backgroundColor: '#0f1c31', borderRadius: 14, padding: 3, marginBottom: 10 },
  subTab: { paddingHorizontal: 22, paddingVertical: 7, borderRadius: 11 },
  subTabActive: { backgroundColor: CARD_TOP },
  subTabText: { color: COLORS.hudSubText, fontWeight: '800', fontSize: 14 },
  subTabTextActive: { color: '#fff' },
  explain: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f1c31', borderRadius: 12, padding: 10, marginBottom: 10 },
  explainIcon: { width: 30, height: 30 },
  explainText: { flex: 1, color: COLORS.hudText, fontSize: 12, lineHeight: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  pack: {
    width: '48.5%',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: CARD_EDGE,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 8,
  },
  packTop: { position: 'absolute', left: 0, right: 0, top: 0, height: '45%', backgroundColor: CARD_TOP, opacity: 0.55 },
  packName: { color: '#fff', fontSize: 15, fontWeight: '900', textShadowColor: '#000a', textShadowRadius: 3, paddingHorizontal: 8 },
  packAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  packAmountIcon: { width: 20, height: 20 },
  packAmount: { color: '#fff', fontSize: 20, fontWeight: '900', textShadowColor: '#000a', textShadowRadius: 3 },
  packSub: { color: '#bcd6ff', fontSize: 11, fontWeight: '700' },
  packArt: { height: 104, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  // Rozet adın üstüne binmesin: görselin sağ alt köşesinde, fiyatın hemen üstünde.
  bonus: {
    position: 'absolute',
    right: 6,
    bottom: 48,
    backgroundColor: '#ff5a5a',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd0d0',
  },
  bonusText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  priceBar: {
    alignSelf: 'stretch',
    minHeight: 40,
    backgroundColor: PRICE,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 2,
    borderColor: '#fff3b0',
  },
  priceOwned: { backgroundColor: '#8bdc6a', borderColor: '#c9f5b4' },
  priceEquip: { backgroundColor: '#7fb2ff', borderColor: '#cfe2ff' },
  priceText: { color: '#2a1a00', fontSize: 17, fontWeight: '900' },
  pile: { width: 140, height: 100 },
  skinArt: { height: 128, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  skinWrap: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
  skinImg: { width: 128, height: 128 },
  skinLocked: { opacity: 1 },
  pileChest: { position: 'absolute', left: 30, top: -6, width: 80, height: 80, opacity: 0.95 },
  offers: { gap: 12 },
  legal: { marginTop: -4, paddingHorizontal: 6, gap: 6 },
  legalText: { color: COLORS.hudSubText, fontSize: 11, lineHeight: 15 },
  legalLinks: { flexDirection: 'row', gap: 18 },
  legalLink: { color: COLORS.hudText, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline', paddingVertical: 6 },
  offer: { backgroundColor: CARD, borderRadius: 16, borderWidth: 2, overflow: 'hidden', padding: 12, gap: 10 },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerArt: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  offerIcon: { width: 60, height: 60 },
  offerInfo: { flex: 1, gap: 2 },
  offerTitle: { fontSize: 18, fontWeight: '900' },
  offerLine: { color: '#dbe8ff', fontSize: 13, lineHeight: 18 },
  offerButton: {
    minHeight: UI.minTouch,
    borderRadius: 12,
    backgroundColor: PRICE,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderColor: '#c99a10',
  },
  offerButtonText: { color: '#2a1a00', fontSize: 16, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  tag: { position: 'absolute', right: 10, top: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { color: '#1a1030', fontSize: 11, fontWeight: '900' },
  passWrap: { gap: 6 },
  passHead: { backgroundColor: CARD, borderRadius: 16, borderWidth: 2, borderColor: '#c9b6ff', padding: 12, gap: 6, marginBottom: 4 },
  passSeason: { color: '#c9b6ff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  passHint: { color: '#dbe8ff', fontSize: 12, textAlign: 'center' },
  passBar: { height: 12, borderRadius: 6, backgroundColor: '#0a1426', overflow: 'hidden', borderWidth: 1, borderColor: '#c9b6ff' },
  passFill: { height: '100%', backgroundColor: '#c9b6ff' },
  passBuy: { marginTop: 4 },
  passCols: { flexDirection: 'row', alignItems: 'center' },
  passCol: { flex: 1, color: COLORS.hudSubText, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  passColPremium: { color: '#c9b6ff' },
  passMid: { width: 44 },
  passRow: { flexDirection: 'row', alignItems: 'center' },
  passNode: {
    width: 36,
    height: 36,
    marginHorizontal: 4,
    borderRadius: 18,
    backgroundColor: '#13233d',
    borderWidth: 2,
    borderColor: '#24406a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passNodeOn: { backgroundColor: '#c9b6ff', borderColor: '#fff' },
  passNodeText: { color: COLORS.hudSubText, fontWeight: '900' },
  passNodeTextOn: { color: '#1a1030' },
  chip: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: '#13233d',
    borderWidth: 1,
    borderColor: '#24406a',
  },
  chipPremium: { backgroundColor: '#241a40', borderColor: '#4a3a7a' },
  chipReady: { borderColor: PRICE, borderWidth: 2, backgroundColor: '#3a3010' },
  chipClaimed: { opacity: 0.45 },
  chipIcon: { width: 26, height: 26 },
  chipText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  chipCheck: { color: '#8bdc6a', fontWeight: '900', fontSize: 16 },
  chipLock: { width: 16, height: 16, opacity: 0.8 },
  restore: { minHeight: UI.minTouch, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  restoreText: { color: COLORS.hudSubText, fontSize: 14, textDecorationLine: 'underline' },
  note: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 90,
    backgroundColor: COLORS.panelBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  noteText: { color: COLORS.hudText, fontSize: 14, fontWeight: '700' },
  wallet: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: '#24406a',
  },
  coin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f1c31',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#24406a',
  },
  coinIcon: { width: 24, height: 24 },
  coinText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});

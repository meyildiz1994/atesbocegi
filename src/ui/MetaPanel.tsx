import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS, GARDEN, GARDEN_ORDER, QUESTS, UI, ZONES, type GardenId } from '../config/balance';
import {
  ALL_RARES,
  foundCount,
  gardenCost,
  gardenMaxed,
  gardenProgress,
  questProgress,
  RARE_PER_ZONE,
  rareColor,
  rareId,
  zoneSetComplete,
} from '../game/meta';
import { countersOf, useGame } from '../game/state';
import { t, type I18nKey } from '../i18n';
import { track } from '../services/analytics';
import { hapticJarEmpty, hapticSuccess } from '../services/haptics';
import { GARDEN_ICONS, UI_ICONS } from './icons';
import { Sheet } from './Sheet';

type Tab = 'quests' | 'garden' | 'collection';
const TABS: Tab[] = ['quests', 'garden', 'collection'];
const TAB_ICONS: Record<Tab, number> = { quests: UI_ICONS.quests, garden: UI_ICONS.garden, collection: UI_ICONS.collection };

/** Gece Bahçesi: Günlük Görevler, Işık Bahçesi ve Koleksiyon tek panelde. */
export function MetaPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('quests');
  const tokens = useGame((s) => Math.floor(s.jarTokens));

  const jars = (
    <View style={styles.tokens}>
      <Image source={UI_ICONS.upgrades} style={styles.tokenIcon} />
      <Text style={styles.tokenText}>{tokens}</Text>
    </View>
  );

  return (
    <Sheet title={t('meta.title')} onClose={onClose} headerRight={jars}>
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
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{t(`meta.tab.${id}` as I18nKey)}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'quests' ? <Quests /> : null}
        {tab === 'garden' ? <Garden /> : null}
        {tab === 'collection' ? <Collection /> : null}
      </ScrollView>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

function Quests() {
  const daily = useGame((s) => s.daily);
  const counters = useGame(useShallow(countersOf));
  const claim = useGame((s) => s.claimQuest);
  const claimChest = useGame((s) => s.claimChest);
  if (!daily) return null;
  const allClaimed = daily.claimed.every(Boolean);

  return (
    <>
      {daily.quests.map((qi, i) => {
        const tpl = QUESTS.templates[qi]!;
        const p = questProgress(daily, i, counters);
        const claimed = daily.claimed[i];
        return (
          <View key={i} style={[styles.card, p.done && !claimed && styles.cardReady]}>
            <Image source={UI_ICONS.quests} style={styles.icon} />
            <View style={styles.info}>
              <Text style={styles.name}>{t(`quest.${tpl.kind}` as I18nKey, { target: tpl.target })}</Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${(p.value / p.target) * 100}%` }]} />
              </View>
              <Text style={styles.desc}>
                {p.value} / {p.target} · {t('quest.reward', { count: tpl.reward })}
              </Text>
            </View>
            <Pressable
              disabled={!p.done || claimed}
              onPress={() => {
                const r = claim(i);
                if (r > 0) {
                  hapticSuccess();
                  track('quest_claim', { kind: tpl.kind, reward: r });
                }
              }}
              style={[styles.button, (!p.done || claimed) && styles.buttonOff]}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, (!p.done || claimed) && styles.buttonTextOff]}>
                {claimed ? t('quest.done') : t('quest.claim')}
              </Text>
            </Pressable>
          </View>
        );
      })}
      <View style={[styles.card, allClaimed && !daily.chestClaimed && styles.cardReady]}>
        <Image source={UI_ICONS.chest} style={styles.icon} />
        <View style={styles.info}>
          <Text style={styles.name}>{t('quest.chest')}</Text>
          <Text style={styles.desc}>
            {daily.chestClaimed ? t('quest.newTomorrow') : t('quest.chestDesc', { count: QUESTS.chestTokens })}
          </Text>
        </View>
        <Pressable
          disabled={!allClaimed || daily.chestClaimed}
          onPress={() => {
            if (claimChest(Date.now()) > 0) {
              hapticSuccess();
              track('quest_chest', {});
            }
          }}
          style={[styles.button, (!allClaimed || daily.chestClaimed) && styles.buttonOff]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, (!allClaimed || daily.chestClaimed) && styles.buttonTextOff]}>
            {daily.chestClaimed ? t('quest.done') : t('quest.chestOpen')}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>{t('meta.jarsHint')}</Text>
    </>
  );
}

// ---------------------------------------------------------------------------

function Garden() {
  const garden = useGame((s) => s.garden);
  const pct = Math.round(gardenProgress(garden) * 100);
  return (
    <>
      <View style={styles.gardenScene}>
        {GARDEN_ORDER.map((id) => (
          <Image
            key={id}
            source={GARDEN_ICONS[id]}
            style={[styles.sceneIcon, { opacity: garden[id] > 0 ? 1 : 0.18 }]}
          />
        ))}
        <Text style={styles.sceneText}>{t('garden.lit', { pct })}</Text>
      </View>
      {GARDEN_ORDER.map((id) => (
        <GardenRow key={id} id={id} />
      ))}
    </>
  );
}

function GardenRow({ id }: { id: GardenId }) {
  const level = useGame((s) => s.garden[id]);
  const tokens = useGame((s) => s.jarTokens);
  const buy = useGame((s) => s.buyGarden);
  const maxed = gardenMaxed(id, level);
  const cost = gardenCost(id, level);
  const affordable = !maxed && tokens >= cost;

  return (
    <View style={[styles.card, affordable && styles.cardReady]}>
      <Image source={GARDEN_ICONS[id]} style={[styles.icon, level === 0 && styles.unbuilt]} />
      <View style={styles.info}>
        <Text style={styles.name}>{t(`garden.${id}` as I18nKey)}</Text>
        <Text style={styles.desc}>{t(`garden.${id}.desc` as I18nKey)}</Text>
        <Text style={styles.level}>
          {t('ui.level', { level })} / {GARDEN[id].maxLevel}
        </Text>
      </View>
      <Pressable
        disabled={!affordable}
        onPress={() => {
          if (buy(id)) {
            hapticJarEmpty();
            track('garden_buy', { id, level: level + 1 });
          }
        }}
        style={[styles.button, !affordable && styles.buttonOff]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonCount, !affordable && styles.buttonTextOff]}>
          {maxed ? '' : level === 0 ? t('garden.build') : t('garden.upgrade')}
        </Text>
        <Text style={[styles.buttonText, !affordable && styles.buttonTextOff]}>
          {maxed ? t('ui.maxed') : `${cost} ⚱`}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------

function Collection() {
  const found = useGame((s) => s.collection);
  return (
    <>
      <Text style={styles.progress}>{t('collection.progress', { found: foundCount(found), total: ALL_RARES.length })}</Text>
      {ZONES.map((_, z) => {
        const done = zoneSetComplete(found, z);
        return (
          <View key={z} style={[styles.zoneCard, done && styles.cardReady]}>
            <Text style={styles.zoneName}>
              {t(`zone.${z + 1}` as I18nKey)}
              {done ? `  ·  ${t('collection.setDone')}` : ''}
            </Text>
            <View style={styles.rares}>
              {Array.from({ length: RARE_PER_ZONE }, (__, k) => {
                const id = rareId(z, k);
                const n = found[id] ?? 0;
                const color = rareColor(id);
                return (
                  <View key={id} style={styles.rare}>
                    <View
                      style={[
                        styles.orb,
                        n > 0
                          ? { backgroundColor: color, shadowColor: color, shadowOpacity: 1 }
                          : styles.orbUnknown,
                      ]}
                    />
                    <Text style={[styles.rareName, n === 0 && styles.rareUnknown]} numberOfLines={1}>
                      {n > 0 ? t(`rare.${id}` as I18nKey) : t('collection.unknown')}
                    </Text>
                    {n > 1 ? <Text style={styles.rareCount}>×{n}</Text> : null}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
      <Text style={styles.hint}>{t('collection.hint')}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  tokens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 6,
    paddingRight: 10,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.badge,
  },
  tokenIcon: { width: 22, height: 22 },
  tokenText: { color: COLORS.badge, fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  tab: {
    flex: 1,
    minHeight: UI.minTouch,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  tabActive: { borderColor: COLORS.accent, backgroundColor: COLORS.cardBgAffordable },
  tabIcon: { width: 26, height: 26 },
  tabText: { color: COLORS.hudSubText, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: COLORS.accent },
  list: { paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  cardReady: {
    backgroundColor: COLORS.cardBgAffordable,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  icon: { width: 52, height: 52, marginRight: 10 },
  unbuilt: { opacity: 0.4 },
  info: { flex: 1, paddingRight: 10, gap: 3 },
  name: { color: COLORS.hudText, fontSize: 15, fontWeight: '700' },
  desc: { color: COLORS.hudSubText, fontSize: 12 },
  level: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#0a1a1f', overflow: 'hidden', marginTop: 2 },
  trackFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },
  button: {
    minWidth: 84,
    minHeight: UI.minTouch,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  buttonOff: { backgroundColor: '#1f2c3a' },
  buttonCount: { color: COLORS.accentText, fontSize: 11, fontWeight: '700' },
  buttonText: { color: COLORS.accentText, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  buttonTextOff: { color: COLORS.disabled },
  hint: { color: COLORS.hudSubText, fontSize: 12, lineHeight: 17, textAlign: 'center', paddingHorizontal: 8 },
  gardenScene: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#07140f',
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  sceneIcon: { width: 58, height: 58, marginHorizontal: 2 },
  sceneText: { width: '100%', textAlign: 'center', color: COLORS.accent, fontWeight: '700', marginTop: 6 },
  progress: { color: COLORS.accent, fontWeight: '800', fontSize: 15, textAlign: 'center' },
  zoneCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    gap: 10,
  },
  zoneName: { color: COLORS.hudText, fontWeight: '700', fontSize: 14 },
  rares: { flexDirection: 'row', justifyContent: 'space-between' },
  rare: { flex: 1, alignItems: 'center', gap: 6 },
  orb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  orbUnknown: { backgroundColor: '#1a2633', borderWidth: 1, borderColor: COLORS.panelBorder },
  rareName: { color: COLORS.hudText, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  rareUnknown: { color: COLORS.disabled },
  rareCount: { color: COLORS.hudSubText, fontSize: 10 },
});

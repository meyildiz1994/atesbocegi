import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import {
  COLLECTION,
  CRYSTAL,
  MOON_CYCLES,
  OFFLINE,
  PERKS,
  WORLD_EVENTS,
  type PerkBranch,
  type ContainerId,
  type StarUpgradeId,
  QUESTS,
  RATE_WINDOW_SECONDS,
  VIP,
  type SkinId,
  SKILLS,
  ZONES,
  type GardenId,
  type SkillId,
  type UpgradeId,
} from '../config/balance';
import {
  canBuySkill,
  canPrestige,
  computeStats,
  jarPayout,
  offlineEarnings,
  offlineSeconds,
  purchasePlan,
  stardustForPrestige,
  unlockedZoneCount,
  zoneBrightness,
  type BuyMode,
  type Stats,
} from './economy';
import { boostMultiplier, extendBoost, purchaseMultiplier, type Purchases } from './monetization';
import {
  claimableCount,
  collectionMultiplier,
  countsAsFilled,
  ensureDaily,
  gardenCost,
  gardenMaxed,
  localDay,
  questProgress,
  rollRare,
  tokensForEmpty,
  type MetaCounters,
} from './meta';
import { dawnStardust, moonComplete, moonRules } from './moonCycle';
import { currentPass, lightForHours, passReward, passTier, type PassReward } from './store';
import { emptyLevels, newSave, type SaveData, type Settings } from './save';
import {
  containerOf,
  containerUnlocked,
  emptyPerks,
  eventLightMultiplier,
  perkEffects,
  starCost,
  starEffects,
  starMaxed,
  type WorldEventKind,
} from './zoneMechanics';

export type OfflineReport = { seconds: number; gain: number };

type Transient = {
  /** Kavanozun anlık doluluğu (UI thread'den saniyede ≤10 kez gelir). */
  jarCount: number;
  /** Ekrandaki ateşböceği sayısı (geliştirici overlay'i için). */
  activeFireflies: number;
  /** Son kazançlar [zaman ms, miktar], Işık/sn için. */
  recentGains: [number, number][];
  buyMode: BuyMode;
  /** Şafak animasyonu tetikleyicisi (artan sayaç). */
  dawnCounter: number;
  /** Test build'lerinde performans denemesi: 0 değilse ekrandaki böcek sayısı bu olur. */
  stressFireflies: number;
  /** Son bulunan nadir böcek (bildirim için); `n` her bulunuşta artar. */
  lastRare: { id: string; n: number; duplicate: boolean } | null;
  /** Dünya olayları ve kristal rezonansı bitiş zamanları (ms). */
  moonUntil: number;
  meteorUntil: number;
  resonanceUntil: number;
};

export type GameState = SaveData & Transient;

export type GameActions = {
  /** Kavanozdaki `count` böceği ışığa çevirir, kazanılan Işık'ı döner. */
  emptyJar: (count: number, now?: number, r1?: number, r2?: number) => number;
  setLiveStats: (jarCount: number, activeFireflies: number) => void;
  buyUpgrade: (id: UpgradeId) => boolean;
  setBuyMode: (mode: BuyMode) => void;
  setZone: (index: number) => void;
  prestige: () => number;
  buySkill: (id: SkillId) => boolean;
  /** Açılışta çağrılır: yokluk süresine göre offline kazancı hesaplar. */
  computeOffline: (now: number) => OfflineReport | null;
  /** Offline kazancı (çarpanla) hesaba ekler. */
  claimOffline: (multiplier?: number) => number;
  addPlayTime: (seconds: number) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setTutorialStep: (step: number) => void;
  setStressFireflies: (n: number) => void;
  /** Ödüllü ×2 Işık'ı başlatır/uzatır. */
  startBoost: (now: number) => void;
  /** Doğrudan Işık ekler (Altın Ateşböceği ödülü). */
  grantLight: (amount: number, now?: number) => void;
  setPurchases: (p: Purchases) => void;
  markInterstitial: (now: number) => void;
  /** Altın böcek yakalandı (görev sayacı). */
  noteGolden: () => void;
  buyGarden: (id: GardenId) => boolean;
  /** Gün değiştiyse yeni görevleri kurar. */
  refreshDaily: (now: number) => void;
  claimQuest: (i: number) => number;
  claimChest: (now: number) => number;
  /** Kayıttan yükle. */
  hydrate: (data: SaveData) => void;
  setContainer: (id: ContainerId) => boolean;
  buyStar: (id: StarUpgradeId) => boolean;
  /** Boss yenildi: ödül Işık ve jeton. */
  winBoss: (zoneIndex: number, light: number, tokens: number) => void;
  markHint: (zoneIndex: number) => void;
  startWorldEvent: (kind: WorldEventKind, now: number) => void;
  startResonance: (now: number) => void;
  /** Açılan en ileri bölgeyi kaydeder (kaplar için). */
  noteBestZone: (zoneIndex: number) => void;
  takePerk: (branch: PerkBranch) => void;
  resetProgress: (now: number) => void;
  /** Mağaza: jeton, saatlik Işık, kostüm. */
  grantTokens: (n: number) => void;
  grantLightHours: (hours: number, now?: number) => number;
  grantSkins: (ids: SkinId[]) => void;
  setSkin: (id: SkinId | null) => void;
  /** Gece Kartı: premium yolu bu sezon için açar; basamak ödülünü alır. */
  activatePass: (now: number) => void;
  claimPass: (tier: number, premium: boolean, now: number) => PassReward | null;
  /** Gece Işığı: günde bir jeton. */
  claimVipDaily: (now: number) => number;
  /** Kaydedilecek veri. */
  snapshot: (now: number) => SaveData;
};

const transient = (): Transient => ({
  jarCount: 0,
  activeFireflies: 0,
  recentGains: [],
  lastRare: null,
  moonUntil: 0,
  meteorUntil: 0,
  resonanceUntil: 0,
  buyMode: 1,
  dawnCounter: 0,
  stressFireflies: 0,
});

export const initialGameState = (now = Date.now()): GameState => ({ ...newSave(now), ...transient() });

type StatSource = Pick<GameState, 'levels' | 'skills' | 'stardustEarned' | 'zoneIndex' | 'purchases'> &
  Partial<Pick<GameState, 'garden' | 'collection' | 'container' | 'starLevels' | 'perks'>>;

export function statsOf(s: StatSource): Stats {
  return computeStats({
    levels: s.levels,
    skills: s.skills,
    stardustEarned: s.stardustEarned,
    zoneIndex: s.zoneIndex,
    purchaseMultiplier: purchaseMultiplier(s.purchases),
    garden: s.garden,
    collectionMultiplier: collectionMultiplier(s.collection, s.zoneIndex),
    container: s.container,
    starLevels: s.starLevels,
    perks: s.perks,
  });
}

/** Görev sayaçları. */
export function countersOf(s: Pick<GameState, 'jarsFilled' | 'goldenCaught' | 'upgradesBought' | 'raresFound' | 'playTimeSec'>): MetaCounters {
  return {
    jarsFilled: s.jarsFilled,
    goldenCaught: s.goldenCaught,
    upgradesBought: s.upgradesBought,
    raresFound: s.raresFound,
    playTimeSec: s.playTimeSec,
  };
}

/** Alınmayı bekleyen görev ödülü sayısı. */
export function selectClaimable(s: GameState): number {
  return s.daily ? claimableCount(s.daily, countersOf(s)) : 0;
}

export const useGame = create<GameState & GameActions>()((set, get) => ({
  ...initialGameState(),

  emptyJar: (count, now = Date.now(), r1 = Math.random(), r2 = Math.random()) => {
    const s = get();
    const st = statsOf(s);
    const gain = jarPayout(
      count,
      st.valuePerFirefly,
      boostMultiplier(now, s.boostUntil) * eventLightMultiplier(now, s.moonUntil, s.resonanceUntil),
    );
    if (gain <= 0) return 0;
    // Kavanoz jetonu, görev sayacı ve nadir böcek.
    let jarTokens = s.jarTokens + tokensForEmpty(count, st.jarCapacity) * moonRules(s.moonCycle).tokens;
    const filled = countsAsFilled(count, st.jarCapacity);
    const rare = rollRare(
      s.zoneIndex,
      count,
      st.jarCapacity,
      r1,
      r2,
      containerOf(s.container).rareMult * perkEffects(s.perks).luck,
    );
    let collection = s.collection;
    let lastRare = s.lastRare;
    let raresFound = s.raresFound;
    if (rare) {
      const duplicate = (collection[rare] ?? 0) > 0;
      collection = { ...collection, [rare]: (collection[rare] ?? 0) + 1 };
      if (duplicate) jarTokens += COLLECTION.duplicateTokens;
      raresFound += 1;
      lastRare = { id: rare, n: (lastRare?.n ?? 0) + 1, duplicate };
    }
    const zoneLight = s.zoneLight.slice();
    zoneLight[s.zoneIndex] = (zoneLight[s.zoneIndex] ?? 0) + gain;
    const cutoff = now - RATE_WINDOW_SECONDS * 1000;
    const recentGains = s.recentGains.filter(([t]) => t >= cutoff);
    recentGains.push([now, gain]);
    set({
      light: s.light + gain,
      runLight: s.runLight + gain,
      lifetimeLight: s.lifetimeLight + gain,
      zoneLight,
      jarCount: 0,
      recentGains,
      jarTokens,
      jarsFilled: s.jarsFilled + (filled ? 1 : 0),
      runJars: s.runJars + (filled ? 1 : 0),
      pass: filled ? { ...currentPass(s.pass, now), jars: currentPass(s.pass, now).jars + 1 } : s.pass,
      collection,
      raresFound,
      lastRare,
    });
    return gain;
  },

  setLiveStats: (jarCount, activeFireflies) => {
    const s = get();
    if (s.jarCount !== jarCount || s.activeFireflies !== activeFireflies) {
      set({ jarCount, activeFireflies });
    }
  },

  buyUpgrade: (id) => {
    const s = get();
    const plan = purchasePlan(id, s.levels[id], s.light, s.buyMode);
    if (!plan.affordable || plan.count <= 0) return false;
    set({
      light: s.light - plan.cost,
      levels: { ...s.levels, [id]: s.levels[id] + plan.count },
      upgradesBought: s.upgradesBought + plan.count,
    });
    return true;
  },

  setBuyMode: (buyMode) => set({ buyMode }),

  setZone: (index) => {
    const s = get();
    const max = unlockedZoneCount(s.runLight) - 1;
    const zoneIndex = Math.max(0, Math.min(max, index));
    if (zoneIndex !== s.zoneIndex) set({ zoneIndex, jarCount: 0 });
  },

  prestige: () => {
    const s = get();
    if (!canPrestige(s.runLight)) return 0;
    const dust = dawnStardust(s.runLight, s.moonCycle);
    // Ay tamamlandıysa bir sonraki aya geçilir; yeni bir aya ilk girişte jeton.
    const moonCycle = moonComplete(s.runLight) ? s.moonCycle + 1 : s.moonCycle;
    const firstTime = moonCycle > s.moonBest;
    const levels = emptyLevels();
    if (s.skills.keepAuto) levels.autoEmpty = s.levels.autoEmpty;
    const head = starEffects(s.starLevels).headStart;
    set({
      light: head,
      runLight: 0,
      bossDone: [],
      perks: emptyPerks(),
      perksTaken: 0,
      runJars: 0,
      zoneLight: ZONES.map(() => 0),
      zoneIndex: 0,
      levels,
      stardust: s.stardust + dust,
      stardustEarned: s.stardustEarned + dust,
      prestigeCount: s.prestigeCount + 1,
      moonCycle,
      moonBest: Math.max(s.moonBest, moonCycle),
      jarTokens: s.jarTokens + (firstTime ? MOON_CYCLES.firstTimeTokens : 0),
      jarCount: 0,
      recentGains: [],
      dawnCounter: s.dawnCounter + 1,
    });
    return dust;
  },

  buySkill: (id) => {
    const s = get();
    if (!canBuySkill(id, s.skills, s.stardust)) return false;
    set({ stardust: s.stardust - SKILLS[id].cost, skills: { ...s.skills, [id]: true } });
    return true;
  },

  computeOffline: (now) => {
    const s = get();
    const st = statsOf(s);
    const seconds = offlineSeconds(s.lastSeen, now, st.offlineCapSeconds);
    const gain = offlineEarnings(st, seconds);
    const prev = s.offlineReport;
    const fresh = seconds >= OFFLINE.minSecondsForPanel && gain > 0 ? { seconds, gain } : null;
    // Alınmamış bir önceki rapor varsa üstüne ekle.
    const report = prev && fresh ? { seconds: prev.seconds + fresh.seconds, gain: prev.gain + fresh.gain } : (fresh ?? prev);
    set({ offlineReport: report, lastSeen: now });
    return fresh;
  },

  claimOffline: (multiplier = 1) => {
    const s = get();
    const r = s.offlineReport;
    if (!r) return 0;
    const gain = r.gain * multiplier;
    const zoneLight = s.zoneLight.slice();
    zoneLight[s.zoneIndex] = (zoneLight[s.zoneIndex] ?? 0) + gain;
    set({
      light: s.light + gain,
      runLight: s.runLight + gain,
      lifetimeLight: s.lifetimeLight + gain,
      zoneLight,
      offlineReport: null,
    });
    return gain;
  },

  addPlayTime: (seconds) => set({ playTimeSec: get().playTimeSec + seconds }),

  setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

  setTutorialStep: (tutorialStep) => set({ tutorialStep }),

  setStressFireflies: (stressFireflies) => set({ stressFireflies }),

  startBoost: (now) => set({ boostUntil: extendBoost(now, get().boostUntil) }),

  grantLight: (amount, now = Date.now()) => {
    const s = get();
    if (!(amount > 0)) return;
    const zoneLight = s.zoneLight.slice();
    zoneLight[s.zoneIndex] = (zoneLight[s.zoneIndex] ?? 0) + amount;
    const cutoff = now - RATE_WINDOW_SECONDS * 1000;
    set({
      light: s.light + amount,
      runLight: s.runLight + amount,
      lifetimeLight: s.lifetimeLight + amount,
      zoneLight,
      // Işık/sn göstergesini şişirmesin diye recentGains'e eklenmez.
      recentGains: s.recentGains.filter(([t]) => t >= cutoff),
    });
  },

  setPurchases: (purchases) => {
    const cur = get().purchases;
    if (cur.removeAds !== purchases.removeAds || cur.starter !== purchases.starter || cur.vip !== purchases.vip) set({ purchases });
  },

  markInterstitial: (lastInterstitialAt) => set({ lastInterstitialAt }),

  noteGolden: () => set({ goldenCaught: get().goldenCaught + 1 }),

  buyGarden: (id) => {
    const s = get();
    const level = s.garden[id];
    if (gardenMaxed(id, level)) return false;
    const cost = gardenCost(id, level);
    if (s.jarTokens < cost) return false;
    set({ jarTokens: s.jarTokens - cost, garden: { ...s.garden, [id]: level + 1 } });
    return true;
  },

  refreshDaily: (now) => {
    const s = get();
    const d = ensureDaily(s.daily, now, countersOf(s));
    if (d !== s.daily) set({ daily: d });
  },

  claimQuest: (i) => {
    const s = get();
    const d = s.daily;
    if (!d || d.claimed[i] || !questProgress(d, i, countersOf(s)).done) return 0;
    const reward = QUESTS.templates[d.quests[i] ?? 0]?.reward ?? 0;
    const claimed = d.claimed.slice();
    claimed[i] = true;
    set({ daily: { ...d, claimed }, jarTokens: s.jarTokens + reward });
    return reward;
  },

  claimChest: (now) => {
    const s = get();
    const d = s.daily;
    if (!d || d.chestClaimed || !d.claimed.every(Boolean)) return 0;
    set({
      daily: { ...d, chestClaimed: true },
      jarTokens: s.jarTokens + QUESTS.chestTokens,
      boostUntil: extendBoost(now, s.boostUntil),
    });
    return QUESTS.chestTokens;
  },

  hydrate: (data) => set({ ...data, ...transient() }),

  setContainer: (id) => {
    const s = get();
    if (!containerUnlocked(id, s.bestZone) || s.container === id) return false;
    set({ container: id });
    return true;
  },

  buyStar: (id) => {
    const s = get();
    const level = s.starLevels[id];
    if (starMaxed(id, level)) return false;
    const cost = starCost(id, level);
    if (s.stardust < cost) return false;
    set({ stardust: s.stardust - cost, starLevels: { ...s.starLevels, [id]: level + 1 } });
    return true;
  },

  winBoss: (zoneIndex, light, tokens) => {
    const s = get();
    if (s.bossDone.includes(zoneIndex)) return;
    set({ bossDone: [...s.bossDone, zoneIndex], jarTokens: s.jarTokens + tokens });
    get().grantLight(light);
  },

  markHint: (zoneIndex) => {
    const s = get();
    if (!s.hintsSeen.includes(zoneIndex)) set({ hintsSeen: [...s.hintsSeen, zoneIndex] });
  },

  startWorldEvent: (kind, now) => {
    if (kind === 'moon') set({ moonUntil: now + WORLD_EVENTS.moon.durationSec * 1000 });
    else set({ meteorUntil: now + WORLD_EVENTS.meteor.durationSec * 1000 });
  },

  startResonance: (now) => set({ resonanceUntil: now + CRYSTAL.resonanceSec * 1000 }),

  takePerk: (branch) => {
    const s = get();
    if (s.perks[branch] >= PERKS[branch].maxTier) return;
    set({ perks: { ...s.perks, [branch]: s.perks[branch] + 1 }, perksTaken: s.perksTaken + 1 });
  },

  noteBestZone: (zoneIndex) => {
    if (zoneIndex > get().bestZone) set({ bestZone: zoneIndex });
  },

  resetProgress: (now) => {
    // Ayarlar ve satın alımlar (parası ödenmiş) sıfırlanmaz.
    const { settings, purchases, skins, skin } = get();
    set({ ...initialGameState(now), settings, purchases, skins, skin });
  },

  grantTokens: (n) => {
    if (n > 0) set({ jarTokens: get().jarTokens + n });
  },

  grantLightHours: (hours, now = Date.now()) => {
    const s = get();
    const st = statsOf(s);
    const amount = lightForHours(hours, lightPerSecond(s, now), st.jarCapacity * st.valuePerFirefly);
    get().grantLight(amount, now);
    return amount;
  },

  grantSkins: (ids) => {
    const s = get();
    const add = ids.filter((id) => !s.skins.includes(id));
    if (add.length) set({ skins: [...s.skins, ...add] });
  },

  setSkin: (skin) => {
    if (skin === null || get().skins.includes(skin)) set({ skin });
  },

  activatePass: (now) => set({ pass: { ...currentPass(get().pass, now), premium: true } }),

  claimPass: (tier, premium, now) => {
    const s = get();
    const p = currentPass(s.pass, now);
    if (tier < 1 || tier > passTier(p.jars) || (premium && !p.premium)) return null;
    const list = premium ? p.claimedPremium : p.claimedFree;
    if (list.includes(tier)) return null;
    const r = passReward(tier, premium);
    set({
      pass: premium ? { ...p, claimedPremium: [...list, tier] } : { ...p, claimedFree: [...list, tier] },
      jarTokens: s.jarTokens + r.tokens,
    });
    if (r.lightHours) get().grantLightHours(r.lightHours, now);
    if (r.skin) get().grantSkins([r.skin]);
    return r;
  },

  claimVipDaily: (now) => {
    const s = get();
    const day = localDay(now);
    if (!s.purchases.vip || s.vipDay === day) return 0;
    set({ vipDay: day, jarTokens: s.jarTokens + VIP.dailyTokens });
    return VIP.dailyTokens;
  },

  snapshot: (now) => {
    const s = get();
    return {
      saveVersion: s.saveVersion,
      light: s.light,
      runLight: s.runLight,
      lifetimeLight: s.lifetimeLight,
      zoneLight: s.zoneLight,
      zoneIndex: s.zoneIndex,
      levels: s.levels,
      skills: s.skills,
      stardust: s.stardust,
      stardustEarned: s.stardustEarned,
      prestigeCount: s.prestigeCount,
      settings: s.settings,
      lastSeen: now,
      playTimeSec: s.playTimeSec,
      firstLaunchAt: s.firstLaunchAt,
      tutorialStep: s.tutorialStep,
      offlineReport: s.offlineReport,
      boostUntil: s.boostUntil,
      lastInterstitialAt: s.lastInterstitialAt,
      purchases: s.purchases,
      jarTokens: s.jarTokens,
      garden: s.garden,
      collection: s.collection,
      jarsFilled: s.jarsFilled,
      goldenCaught: s.goldenCaught,
      upgradesBought: s.upgradesBought,
      raresFound: s.raresFound,
      daily: s.daily,
      bestZone: s.bestZone,
      container: s.container,
      bossDone: s.bossDone,
      starLevels: s.starLevels,
      hintsSeen: s.hintsSeen,
      perks: s.perks,
      perksTaken: s.perksTaken,
      runJars: s.runJars,
      skins: s.skins,
      skin: s.skin,
      pass: s.pass,
      vipDay: s.vipDay,
      moonCycle: s.moonCycle,
      moonBest: s.moonBest,
    };
  },
}));

/** Seçili bölgenin aydınlığı (0..1). */
export function selectBrightness(s: GameState): number {
  const zone = ZONES[s.zoneIndex] ?? ZONES[0];
  return zoneBrightness(s.zoneLight[s.zoneIndex] ?? 0, zone.targetLog);
}

/** Son RATE_WINDOW_SECONDS içindeki ortalama Işık/sn. */
export function lightPerSecond(s: Pick<GameState, 'recentGains'>, now: number): number {
  const cutoff = now - RATE_WINDOW_SECONDS * 1000;
  let sum = 0;
  for (const [t, g] of s.recentGains) if (t >= cutoff) sum += g;
  return sum / RATE_WINDOW_SECONDS;
}

/** Bileşenler için: statlar yalnızca girdileri değişince yeniden hesaplanır. */
export function useStats(): Stats {
  const input = useGame(
    useShallow((s) => ({
      levels: s.levels,
      skills: s.skills,
      stardustEarned: s.stardustEarned,
      zoneIndex: s.zoneIndex,
      purchases: s.purchases,
      garden: s.garden,
      collection: s.collection,
      container: s.container,
      starLevels: s.starLevels,
      perks: s.perks,
    })),
  );
  return useMemo(() => statsOf(input), [input]);
}

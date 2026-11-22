import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { OFFLINE, RATE_WINDOW_SECONDS, SKILLS, ZONES, type SkillId, type UpgradeId } from '../config/balance';
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
import { emptyLevels, newSave, type SaveData, type Settings } from './save';

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
};

export type GameState = SaveData & Transient;

export type GameActions = {
  /** Kavanozdaki `count` böceği ışığa çevirir, kazanılan Işık'ı döner. */
  emptyJar: (count: number, now?: number) => number;
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
  /** Kayıttan yükle. */
  hydrate: (data: SaveData) => void;
  resetProgress: (now: number) => void;
  /** Kaydedilecek veri. */
  snapshot: (now: number) => SaveData;
};

const transient = (): Transient => ({
  jarCount: 0,
  activeFireflies: 0,
  recentGains: [],
  buyMode: 1,
  dawnCounter: 0,
  stressFireflies: 0,
});

export const initialGameState = (now = Date.now()): GameState => ({ ...newSave(now), ...transient() });

export function statsOf(
  s: Pick<GameState, 'levels' | 'skills' | 'stardustEarned' | 'zoneIndex' | 'purchases'>,
): Stats {
  return computeStats({
    levels: s.levels,
    skills: s.skills,
    stardustEarned: s.stardustEarned,
    zoneIndex: s.zoneIndex,
    purchaseMultiplier: purchaseMultiplier(s.purchases),
  });
}

export const useGame = create<GameState & GameActions>()((set, get) => ({
  ...initialGameState(),

  emptyJar: (count, now = Date.now()) => {
    const s = get();
    const st = statsOf(s);
    const gain = jarPayout(count, st.valuePerFirefly, boostMultiplier(now, s.boostUntil));
    if (gain <= 0) return 0;
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
    const dust = stardustForPrestige(s.runLight);
    const levels = emptyLevels();
    if (s.skills.keepAuto) levels.autoEmpty = s.levels.autoEmpty;
    set({
      light: 0,
      runLight: 0,
      zoneLight: ZONES.map(() => 0),
      zoneIndex: 0,
      levels,
      stardust: s.stardust + dust,
      stardustEarned: s.stardustEarned + dust,
      prestigeCount: s.prestigeCount + 1,
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
    if (cur.removeAds !== purchases.removeAds || cur.starter !== purchases.starter) set({ purchases });
  },

  markInterstitial: (lastInterstitialAt) => set({ lastInterstitialAt }),

  hydrate: (data) => set({ ...data, ...transient() }),

  resetProgress: (now) => {
    // Ayarlar ve satın alımlar (parası ödenmiş) sıfırlanmaz.
    const { settings, purchases } = get();
    set({ ...initialGameState(now), settings, purchases });
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
    })),
  );
  return useMemo(() => statsOf(input), [input]);
}

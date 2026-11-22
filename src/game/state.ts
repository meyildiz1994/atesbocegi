import { create } from 'zustand';

import { START, ZONES } from '../config/balance';
import { jarPayout, zoneBrightness } from './economy';

export type GameState = {
  /** Harcanabilir Işık. */
  light: number;
  /** Tüm zamanlarda kazanılan Işık. */
  totalLight: number;
  /** Bölge bazında toplanan Işık (aydınlık için). */
  zoneLight: number[];
  zoneIndex: number;
  /** Kavanozun anlık doluluğu (HUD için, UI thread'den saniyede ≤10 kez gelir). */
  jarCount: number;
  /** Ekrandaki ateşböceği sayısı (geliştirici overlay'i için). */
  activeFireflies: number;
  settings: { haptics: boolean; sound: boolean; music: boolean };
};

export type GameActions = {
  /** Kavanozdaki `count` böceği ışığa çevirir, kazanılan Işık'ı döner. */
  emptyJar: (count: number) => number;
  setLiveStats: (jarCount: number, activeFireflies: number) => void;
};

export const initialGameState = (): GameState => ({
  light: 0,
  totalLight: 0,
  zoneLight: ZONES.map(() => 0),
  zoneIndex: 0,
  jarCount: 0,
  activeFireflies: 0,
  settings: { haptics: true, sound: true, music: true },
});

export const useGame = create<GameState & GameActions>()((set, get) => ({
  ...initialGameState(),
  emptyJar: (count) => {
    const s = get();
    const zone = ZONES[s.zoneIndex] ?? ZONES[0];
    const gain = jarPayout(count, START.valuePerFirefly, zone.multiplier);
    if (gain <= 0) return 0;
    const zoneLight = s.zoneLight.slice();
    zoneLight[s.zoneIndex] = (zoneLight[s.zoneIndex] ?? 0) + gain;
    set({ light: s.light + gain, totalLight: s.totalLight + gain, zoneLight, jarCount: 0 });
    return gain;
  },
  setLiveStats: (jarCount, activeFireflies) => {
    const s = get();
    if (s.jarCount !== jarCount || s.activeFireflies !== activeFireflies) {
      set({ jarCount, activeFireflies });
    }
  },
}));

/** Seçili bölgenin aydınlığı (0..1). */
export function selectBrightness(s: GameState): number {
  const zone = ZONES[s.zoneIndex] ?? ZONES[0];
  return zoneBrightness(s.zoneLight[s.zoneIndex] ?? 0, zone.targetLog);
}

/**
 * Kayıt formatı, sürüm migrasyonu ve (de)serileştirme. Saf; depolama soyutlanmıştır
 * (oyunda MMKV, testte bellek içi).
 */
import { SAVE, SKILL_ORDER, UPGRADE_ORDER, ZONES } from '../config/balance';
import type { Levels, Skills } from './economy';

export type Settings = {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  language: 'en' | 'tr' | 'system';
};

export type SaveData = {
  saveVersion: number;
  light: number;
  /** Bu koşuda (son Şafak'tan beri) kazanılan Işık. */
  runLight: number;
  /** Tüm zamanlarda kazanılan Işık. */
  lifetimeLight: number;
  zoneLight: number[];
  zoneIndex: number;
  levels: Levels;
  skills: Skills;
  stardust: number;
  stardustEarned: number;
  prestigeCount: number;
  settings: Settings;
  /** Son kayıt zamanı (ms, cihaz saati). Offline hesap için. */
  lastSeen: number;
  /** Toplam oyun süresi (sn). */
  playTimeSec: number;
  firstLaunchAt: number;
  /** Onboarding adımı (Faz 4). */
  tutorialStep: number;
  /** Henüz alınmamış offline kazanç; panel açıkken uygulama kapanırsa kaybolmasın. */
  offlineReport: { seconds: number; gain: number } | null;
};

export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): boolean | void;
}

export const emptyLevels = (): Levels =>
  Object.fromEntries(UPGRADE_ORDER.map((id) => [id, 0])) as Levels;

export const emptySkills = (): Skills =>
  Object.fromEntries(SKILL_ORDER.map((id) => [id, false])) as Skills;

export const defaultSettings = (): Settings => ({
  sound: true,
  music: true,
  haptics: true,
  language: 'system',
});

export function newSave(now: number): SaveData {
  return {
    saveVersion: SAVE.version,
    light: 0,
    runLight: 0,
    lifetimeLight: 0,
    zoneLight: ZONES.map(() => 0),
    zoneIndex: 0,
    levels: emptyLevels(),
    skills: emptySkills(),
    stardust: 0,
    stardustEarned: 0,
    prestigeCount: 0,
    settings: defaultSettings(),
    lastSeen: now,
    playTimeSec: 0,
    firstLaunchAt: now,
    tutorialStep: 0,
    offlineReport: null,
  };
}

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);

type Raw = Record<string, unknown>;

/**
 * Migrasyonlar: her biri bir önceki sürümün ham nesnesini alır, bir sonrakini döner.
 * Sürüm 0 = `saveVersion` alanı olmayan (geliştirme sırasındaki) kayıtlar.
 */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  0: (raw) => ({ ...raw, saveVersion: 1 }),
  1: (raw) => ({ ...raw, offlineReport: null, saveVersion: 2 }),
};

export function migrate(raw: Raw): Raw {
  let r = raw;
  let v = typeof r.saveVersion === 'number' ? r.saveVersion : 0;
  while (v < SAVE.version) {
    const m = MIGRATIONS[v];
    if (!m) break;
    r = m(r);
    v = typeof r.saveVersion === 'number' ? r.saveVersion : v + 1;
  }
  return r;
}

/** Ham nesneyi güvenli bir SaveData'ya çevirir; bozuk alanlar varsayılana döner. */
export function sanitize(raw: Raw, now: number): SaveData {
  const base = newSave(now);
  const levelsRaw = (raw.levels ?? {}) as Raw;
  const skillsRaw = (raw.skills ?? {}) as Raw;
  const settingsRaw = (raw.settings ?? {}) as Raw;
  const zl = Array.isArray(raw.zoneLight) ? raw.zoneLight : [];
  const lang = settingsRaw.language;
  return {
    saveVersion: SAVE.version,
    light: num(raw.light),
    runLight: num(raw.runLight),
    lifetimeLight: num(raw.lifetimeLight),
    zoneLight: ZONES.map((_, i) => num(zl[i])),
    zoneIndex: Math.min(ZONES.length - 1, Math.floor(num(raw.zoneIndex))),
    levels: Object.fromEntries(
      UPGRADE_ORDER.map((id) => [id, Math.floor(num(levelsRaw[id]))]),
    ) as Levels,
    skills: Object.fromEntries(SKILL_ORDER.map((id) => [id, bool(skillsRaw[id])])) as Skills,
    stardust: Math.floor(num(raw.stardust)),
    stardustEarned: Math.floor(num(raw.stardustEarned)),
    prestigeCount: Math.floor(num(raw.prestigeCount)),
    settings: {
      sound: bool(settingsRaw.sound, true),
      music: bool(settingsRaw.music, true),
      haptics: bool(settingsRaw.haptics, true),
      language: lang === 'en' || lang === 'tr' ? lang : 'system',
    },
    lastSeen: num(raw.lastSeen, base.lastSeen),
    playTimeSec: num(raw.playTimeSec),
    firstLaunchAt: num(raw.firstLaunchAt, base.firstLaunchAt),
    tutorialStep: Math.floor(num(raw.tutorialStep)),
    offlineReport: offlineReportOf(raw.offlineReport),
  };
}

function offlineReportOf(v: unknown): SaveData['offlineReport'] {
  if (!v || typeof v !== 'object') return null;
  const r = v as Raw;
  const gain = num(r.gain);
  return gain > 0 ? { seconds: num(r.seconds), gain } : null;
}

export function serialize(data: SaveData): string {
  return JSON.stringify(data);
}

export function deserialize(text: string | undefined, now: number): SaveData | null {
  if (!text) return null;
  try {
    const raw = JSON.parse(text) as unknown;
    if (!raw || typeof raw !== 'object') return null;
    return sanitize(migrate(raw as Raw), now);
  } catch {
    return null;
  }
}

/**
 * Ana kayda yazar. Bir önceki kayıt okunabiliyorsa yedeğe taşınır; böylece yazma sırasında
 * bozulan bir kayıt en fazla bir otomatik kayıt aralığı (10 sn) ilerleme kaybettirir.
 */
export function writeSave(store: KeyValueStore, data: SaveData): void {
  const prev = store.getString(SAVE.key);
  if (prev && deserialize(prev, data.lastSeen)) store.set(SAVE.backupKey, prev);
  store.set(SAVE.key, serialize(data));
}

/** Ana kaydı okur; bozuksa yedeğe düşer. İkisi de yoksa `null` (yeni oyuncu). */
export function readSave(store: KeyValueStore, now: number): SaveData | null {
  return deserialize(store.getString(SAVE.key), now) ?? deserialize(store.getString(SAVE.backupKey), now);
}

export function clearSave(store: KeyValueStore): void {
  store.remove(SAVE.key);
  store.remove(SAVE.backupKey);
}

/** Testler ve web için bellek içi depo. */
export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getString: (k) => m.get(k),
    set: (k, v) => {
      m.set(k, v);
    },
    remove: (k) => m.delete(k),
  };
}

/**
 * Ses: expo-audio ile kısa efektler (havuzlu, perde ayarlı) ve döngüsel ambiyans.
 * Dosyalar assets/audio/ altında. Şimdilik kodla üretilmiş yer tutucular
 * (scripts/synth-sfx.py); ElevenLabs sürümleri aynı adla değiştirilecek.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { AUDIO } from '../config/balance';
import { useGame } from '../game/state';

export const SOUND_IDS = [
  'sfx_collect_1', 'sfx_collect_2', 'sfx_collect_3',
  'sfx_collect_4', 'sfx_collect_5', 'sfx_collect_6',
  'sfx_jar_empty',
  'amb_zone_1', 'amb_zone_2', 'amb_zone_3', 'amb_zone_4', 'amb_zone_5',
  'music_zone_1', 'music_zone_2', 'music_zone_3', 'music_zone_4', 'music_zone_5',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

const AMB_NIGHT = require('../../assets/audio/amb_night.m4a');
const SOURCES: Partial<Record<SoundId, number>> = {
  sfx_collect_1: require('../../assets/audio/sfx_collect_1.m4a'),
  sfx_collect_2: require('../../assets/audio/sfx_collect_2.m4a'),
  sfx_collect_3: require('../../assets/audio/sfx_collect_3.m4a'),
  sfx_collect_4: require('../../assets/audio/sfx_collect_4.m4a'),
  sfx_collect_5: require('../../assets/audio/sfx_collect_5.m4a'),
  sfx_collect_6: require('../../assets/audio/sfx_collect_6.m4a'),
  sfx_jar_empty: require('../../assets/audio/sfx_jar_empty.m4a'),
  // Bölgeye özel ambiyans ve müzik henüz yok: tüm bölgeler aynı gece ambiyansını kullanır.
  amb_zone_1: AMB_NIGHT,
  amb_zone_2: AMB_NIGHT,
  amb_zone_3: AMB_NIGHT,
  amb_zone_4: AMB_NIGHT,
  amb_zone_5: AMB_NIGHT,
};

const COLLECT_VARIANTS = 6;

/** Toplama sesi: 6 perdeden rastgele biri (pentatonik, art arda uyumlu). */
export function collectSoundId(): SoundId {
  const n = 1 + Math.floor(Math.random() * COLLECT_VARIANTS);
  return `sfx_collect_${n}` as SoundId;
}

let initialized = false;
const pools = new Map<SoundId, { players: AudioPlayer[]; next: number }>();

function init(): void {
  if (initialized) return;
  initialized = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

/**
 * Ses oynatıcılarını önceden hazırlar. Oynatıcı ilk çalışta oluşturulursa dosya senkron
 * yüklenir ve oyun bir an takılır (ilk kavanoz boşaltmada görülen donma). Açılışta, oyun
 * başlamadan bir kez çağrılır; sesler zaman aralığıyla teker teker hazırlanır.
 */
export function preloadSfx(): void {
  const ids = (Object.keys(SOURCES) as SoundId[]).filter((id) => id.startsWith('sfx_'));
  ids.forEach((id, k) =>
    setTimeout(() => {
      try {
        poolFor(id);
      } catch {
        // Ses hatası oyunu durdurmamalı.
      }
    }, 300 + k * 120),
  );
}

function poolFor(id: SoundId) {
  let pool = pools.get(id);
  if (!pool) {
    const src = SOURCES[id];
    if (src === undefined) return null;
    const size = id.startsWith('sfx_collect') ? AUDIO.collectPoolSize : 1;
    pool = { players: Array.from({ length: size }, () => createAudioPlayer(src)), next: 0 };
    pools.set(id, pool);
  }
  return pool;
}

export function playSfx(id: SoundId, opts: { pitch?: number; volume?: number } = {}): void {
  if (!useGame.getState().settings.sound) return;
  try {
    init();
    const pool = poolFor(id);
    if (!pool) return;
    const p = pool.players[pool.next % pool.players.length]!;
    pool.next++;
    p.shouldCorrectPitch = false;
    p.setPlaybackRate(opts.pitch ?? 1);
    p.volume = opts.volume ?? AUDIO.sfxVolume;
    void p.seekTo(0);
    p.play();
  } catch {
    // Ses hatası oyunu durdurmamalı.
  }
}

let ambience: AudioPlayer | null = null;
let ambienceId: SoundId | null = null;

/** Bölgenin ambiyansını döngüde çalar (ayarlarda müzik kapalıysa durdurur). */
export function setAmbience(zoneIndex: number, active: boolean): void {
  try {
    const on = active && useGame.getState().settings.music;
    const id = `amb_zone_${zoneIndex + 1}` as SoundId;
    if (!on) {
      ambience?.pause();
      return;
    }
    init();
    const src = SOURCES[id];
    if (src === undefined) return;
    if (!ambience || (ambienceId !== id && SOURCES[ambienceId!] !== src)) {
      ambience?.remove();
      ambience = createAudioPlayer(src);
      ambience.loop = true;
      ambience.volume = AUDIO.ambienceVolume;
    }
    ambienceId = id;
    ambience.play();
  } catch {
    // yut
  }
}

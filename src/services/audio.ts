/**
 * Ses yer tutucuları. Gerçek dosyalar sonradan (ElevenLabs) eklenecek.
 * Faz 5'te expo-audio ile oynatma bağlanacak.
 */
export const SOUND_IDS = [
  'sfx_collect_1', 'sfx_collect_2', 'sfx_collect_3',
  'sfx_collect_4', 'sfx_collect_5', 'sfx_collect_6',
  'sfx_jar_empty',
  'amb_zone_1', 'amb_zone_2', 'amb_zone_3', 'amb_zone_4', 'amb_zone_5',
  'music_zone_1', 'music_zone_2', 'music_zone_3', 'music_zone_4', 'music_zone_5',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

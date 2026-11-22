import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { maybeShowInterstitial } from '../services/ads';
import { track } from '../services/analytics';
import { setAmbience } from '../services/audio';
import { hapticSuccess } from '../services/haptics';
import { unlockedZoneCount } from './economy';
import { useGame } from './state';

/**
 * Oyun olayları: yeni bölge açılınca başarı titreşimi ve analitik; ambiyansı
 * bölgeye, ayara ve uygulama durumuna göre çalar/durdurur.
 * Yeni açılan bölgenin indeksini döner (bildirim kapanınca null).
 */
export function useGameEvents(): [number | null, () => void] {
  const [unlocked, setUnlocked] = useState<number | null>(null);

  useEffect(() => {
    let known = unlockedZoneCount(useGame.getState().runLight);
    let lastDawn = useGame.getState().dawnCounter;
    return useGame.subscribe((s, prev) => {
      // Oyuncunun bölge değiştirmesi: kurallar uygunsa seyrek geçiş reklamı.
      if (s.zoneIndex !== prev.zoneIndex && s.dawnCounter === prev.dawnCounter) void maybeShowInterstitial();
      if (s.dawnCounter !== lastDawn) {
        // Şafak'ta bölgeler yeniden kilitlenir; bunu açılma sanma.
        lastDawn = s.dawnCounter;
        known = unlockedZoneCount(s.runLight);
        return;
      }
      const n = unlockedZoneCount(s.runLight);
      if (n > known) {
        known = n;
        hapticSuccess();
        track('zone_unlocked', { zone: n, playTimeSec: Math.round(s.playTimeSec) });
        setUnlocked(n - 1);
      }
    });
  }, []);

  const zoneIndex = useGame((s) => s.zoneIndex);
  const music = useGame((s) => s.settings.music);
  useEffect(() => {
    setAmbience(zoneIndex, AppState.currentState === 'active');
    const sub = AppState.addEventListener('change', (st) => setAmbience(zoneIndex, st === 'active'));
    return () => sub.remove();
  }, [zoneIndex, music]);

  const clear = useCallback(() => setUnlocked(null), []);
  return [unlocked, clear];
}

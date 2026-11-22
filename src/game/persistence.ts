import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { SAVE } from '../config/balance';
import { track } from '../services/analytics';
import { getStore } from '../services/storage';
import { bootFrom, resetIn, saveTo } from './session';
import { useGame } from './state';

export function saveNow(): void {
  saveTo(getStore(), Date.now());
}

/** İlerlemeyi siler ve sıfırdan başlatır (ayarlar korunur). */
export function resetAll(): void {
  resetIn(getStore(), Date.now());
}

/**
 * Açılışta kaydı yükler ve offline kazancı hesaplar; her SAVE.autosaveSeconds saniyede
 * bir, uygulama arka plana geçerken ve önemli olaylarda (Şafak, yetenek, offline kazancı
 * alma) hemen kaydeder. Yükleme bitince `true` döner.
 */
export function usePersistence(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootFrom(getStore(), Date.now());
    let sessionStart = Date.now();
    track('session_start', { playTimeSec: Math.round(useGame.getState().playTimeSec) });
    // Kayıt yükleme senkron bir dış sistem okumasıdır; bitince bir kez render tetiklenir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);

    let last = Date.now();
    const tickPlayTime = () => {
      const t = Date.now();
      useGame.getState().addPlayTime((t - last) / 1000);
      last = t;
    };
    const timer = setInterval(() => {
      tickPlayTime();
      saveNow();
    }, SAVE.autosaveSeconds * 1000);

    let wasBackground = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        last = Date.now();
        if (wasBackground) {
          sessionStart = last;
          track('session_start', { playTimeSec: Math.round(useGame.getState().playTimeSec) });
        }
        wasBackground = false;
        useGame.getState().computeOffline(Date.now());
        saveNow();
      } else {
        tickPlayTime();
        saveNow();
        if (state === 'background' && !wasBackground) {
          wasBackground = true;
          track('session_end', { durationSec: Math.round((Date.now() - sessionStart) / 1000) });
        }
      }
    });

    // Geri alınması acı olacak olaylardan sonra 10 sn beklemeden kaydet.
    const unsub = useGame.subscribe((s, prev) => {
      if (
        s.prestigeCount !== prev.prestigeCount ||
        s.skills !== prev.skills ||
        (prev.offlineReport && !s.offlineReport)
      ) {
        saveNow();
      }
    });

    return () => {
      clearInterval(timer);
      sub.remove();
      unsub();
    };
  }, []);

  return ready;
}

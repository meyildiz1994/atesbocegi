import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { SAVE } from '../config/balance';
import { getStore } from '../services/storage';
import { clearSave, readSave, writeSave } from './save';
import { useGame } from './state';

export function saveNow(): void {
  const now = Date.now();
  writeSave(getStore(), useGame.getState().snapshot(now));
  useGame.setState({ lastSeen: now });
}

/** İlerlemeyi siler ve sıfırdan başlatır. */
export function resetAll(): void {
  clearSave(getStore());
  useGame.getState().resetProgress(Date.now());
  saveNow();
}

/**
 * Açılışta kaydı yükler ve offline kazancı hesaplar; her SAVE.autosaveSeconds saniyede
 * bir ve uygulama arka plana geçerken kaydeder. Yükleme bitince `true` döner.
 */
export function usePersistence(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const data = readSave(getStore(), now);
    if (data) useGame.getState().hydrate(data);
    useGame.getState().computeOffline(now);
    saveNow();
    // Kayıt yükleme senkron bir dış sistem okumasıdır; bitince bir kez render tetiklenir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);

    let last = Date.now();
    const timer = setInterval(() => {
      const t = Date.now();
      useGame.getState().addPlayTime((t - last) / 1000);
      last = t;
      saveNow();
    }, SAVE.autosaveSeconds * 1000);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        last = Date.now();
        useGame.getState().computeOffline(Date.now());
      } else {
        saveNow();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return ready;
}

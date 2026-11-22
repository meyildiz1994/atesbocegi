/**
 * Oturum başlangıcı ve kayıt; depolama dışarıdan verilir (oyunda MMKV, testte bellek içi).
 * React'ten ve platformdan bağımsızdır.
 */
import { clearSave, readSave, writeSave, type KeyValueStore } from './save';
import { useGame, type OfflineReport } from './state';

/** Durumu depoya yazar. */
export function saveTo(store: KeyValueStore, now: number): void {
  writeSave(store, useGame.getState().snapshot(now));
  useGame.setState({ lastSeen: now });
}

/**
 * Açılış: kaydı yükler (yoksa yeni oyun), yokluk süresine göre offline kazancı hesaplar ve
 * hemen kaydeder (aynı yokluk iki kez sayılmasın). Hesaplanan offline raporunu döner.
 */
export function bootFrom(store: KeyValueStore, now: number): OfflineReport | null {
  const data = readSave(store, now);
  if (data) useGame.getState().hydrate(data);
  const report = useGame.getState().computeOffline(now);
  saveTo(store, now);
  return report;
}

/** İlerlemeyi siler, ayarları koruyarak sıfırdan başlatır. */
export function resetIn(store: KeyValueStore, now: number): void {
  clearSave(store);
  useGame.getState().resetProgress(now);
  saveTo(store, now);
}

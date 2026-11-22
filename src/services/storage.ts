import { createMMKV } from 'react-native-mmkv';

import { memoryStore, type KeyValueStore } from '../game/save';

let store: KeyValueStore | null = null;

/** Oyun kaydı deposu (MMKV). MMKV açılamazsa bellek içi depoya düşer. */
export function getStore(): KeyValueStore {
  if (store) return store;
  try {
    const mmkv = createMMKV({ id: 'atesbocegi' });
    store = {
      getString: (k) => mmkv.getString(k),
      set: (k, v) => mmkv.set(k, v),
      remove: (k) => mmkv.remove(k),
    };
  } catch {
    store = memoryStore();
  }
  return store;
}

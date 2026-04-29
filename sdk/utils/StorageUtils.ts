// ─────────────────────────────────────────────────────────────────────────────
// StorageUtils.ts — AsyncStorage helpers with JSON parsing, size estimation
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageUtils = {
  /**
   * Reads and JSON-parses a value. Returns null on miss or parse error.
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /**
   * JSON-stringifies and writes a value.
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  /**
   * Estimates byte size of a stored value (UTF-16: ~2 bytes per char).
   */
  async getItemSize(key: string): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return 0;
      return raw.length * 2;
    } catch {
      return 0;
    }
  },

  /**
   * Returns all AsyncStorage keys that start with the given prefix.
   */
  async getAllKeys(prefix: string): Promise<string[]> {
    try {
      const all = await AsyncStorage.getAllKeys();
      return all.filter((k) => k.startsWith(prefix));
    } catch {
      return [];
    }
  },

  /**
   * Reads multiple keys at once and returns a Map of key → parsed value.
   * Uses individual getItem calls for maximum compatibility across RN versions.
   */
  async multiGet<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    if (keys.length === 0) return result;
    await Promise.all(
      keys.map(async (key) => {
        const val = await StorageUtils.getItem<T>(key);
        if (val !== null) result.set(key, val);
      })
    );
    return result;
  },

  async multiRemove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
  },
};

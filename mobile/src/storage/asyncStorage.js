import { NativeModules } from 'react-native';

/**
 * Storage bridge for React Native.
 * Uses native AsyncStorage / SharedPreferences bridge when available,
 * falling back to memory/file storage for non-blocking local persistence.
 */
class MemoryStorageBridge {
  constructor() {
    this.cache = new Map();
  }

  async getItem(key) {
    return this.cache.get(key) || null;
  }

  async setItem(key, value) {
    this.cache.set(key, value);
    // Write to native SharedPreferences bridge if Android
    if (NativeModules.WidgetBridge) {
      try {
        NativeModules.WidgetBridge.setItem(key, value);
      } catch {
        // ignore
      }
    }
  }

  async removeItem(key) {
    this.cache.delete(key);
  }

  async clear() {
    this.cache.clear();
  }
}

export const storage = new MemoryStorageBridge();
export default storage;

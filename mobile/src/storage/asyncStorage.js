import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

/**
 * Storage bridge for React Native.
 * Uses @react-native-async-storage/async-storage for persistent storage
 * with an in-memory cache for fast synchronous-style reads.
 * Also mirrors writes to native WidgetBridge (Android widget SharedPreferences).
 */
class PersistentStorageBridge {
  constructor() {
    this.cache = new Map();
    this._initialized = false;
  }

  /**
   * Pre-load all known keys into cache on app startup for fast reads.
   * Call this once during app initialization.
   */
  async initialize() {
    if (this._initialized) return;
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys && keys.length > 0) {
        const pairs = await AsyncStorage.multiGet(keys);
        pairs.forEach(([key, value]) => {
          if (value !== null) {
            this.cache.set(key, value);
          }
        });
      }
      this._initialized = true;
    } catch (err) {
      console.error('PersistentStorageBridge init error:', err);
      // Fallback: try reading from WidgetBridge if available
      await this._loadFromWidgetBridge();
      this._initialized = true;
    }
  }

  /**
   * Fallback: attempt to load session keys from native WidgetBridge (SharedPreferences).
   * This handles the case where AsyncStorage has no data but WidgetBridge does
   * (e.g. migrating from the old in-memory-only storage that wrote to WidgetBridge).
   */
  async _loadFromWidgetBridge() {
    if (!NativeModules.WidgetBridge || !NativeModules.WidgetBridge.getItem) return;
    const migrationKeys = [
      'finlit_room', 'finlit_member', 'finlit_members',
      'finlit_room_id', 'finlit_member_id', 'finlit_device_id',
      'finlit_expenses', 'finlit_settlements', 'finlit_balances',
      'finlit_recovery_code', 'finlit_offline_queue',
    ];
    for (const key of migrationKeys) {
      try {
        const value = await NativeModules.WidgetBridge.getItem(key);
        if (value !== null && value !== undefined) {
          this.cache.set(key, value);
          // Persist to AsyncStorage for future reads
          await AsyncStorage.setItem(key, value).catch(() => {});
        }
      } catch {
        // ignore per-key failures
      }
    }
  }

  async getItem(key) {
    // Return from cache first (fast path)
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    // Fallback to disk read if cache miss
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        this.cache.set(key, value);
      }
      return value;
    } catch (err) {
      console.error('Storage getItem error:', key, err);
      return null;
    }
  }

  async setItem(key, value) {
    this.cache.set(key, value);
    // Persist to AsyncStorage (disk)
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.error('Storage setItem error:', key, err);
    }
    // Also write to native WidgetBridge for Android widget support
    if (NativeModules.WidgetBridge) {
      try {
        NativeModules.WidgetBridge.setItem(key, value);
      } catch {
        // ignore widget bridge errors
      }
    }
  }

  async removeItem(key) {
    this.cache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.error('Storage removeItem error:', key, err);
    }
  }

  async clear() {
    this.cache.clear();
    try {
      await AsyncStorage.clear();
    } catch (err) {
      console.error('Storage clear error:', err);
    }
  }

  /**
   * Remove all finlit_ prefixed keys (for logout).
   * Preserves device_id so the device identity stays consistent.
   */
  async clearSession() {
    const sessionKeys = [
      'finlit_room', 'finlit_member', 'finlit_members',
      'finlit_room_id', 'finlit_member_id',
      'finlit_expenses', 'finlit_settlements', 'finlit_balances',
      'finlit_recovery_code', 'finlit_offline_queue',
      'finlit_monthly_summary', 'finlit_last_sync',
    ];
    for (const key of sessionKeys) {
      this.cache.delete(key);
    }
    try {
      await AsyncStorage.multiRemove(sessionKeys);
    } catch (err) {
      console.error('Storage clearSession error:', err);
    }
  }
}

export const storage = new PersistentStorageBridge();
export default storage;
